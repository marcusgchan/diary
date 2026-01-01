import { z } from "zod";
import { env } from "~/env.mjs";
import { timingSafeEqual } from "crypto";
import { db } from "~/server/db";
import { createMetadataOnImageCallback } from "~/server/lib/service";
import { getEntryIdByEntryAndDiaryId } from "~/server/lib/repositories/entry";
import { getImage, uploadImage } from "~/server/lib/integrations/s3Service";
import sharp from "sharp";
import ExifReader from "exifreader";
import convert from "heic-convert";
import {
  getOptimizedImageKey,
  IMAGE_SIZES,
} from "~/app/_lib/utils/getCompressedImageKey";

export async function POST(req: Request) {
  const rawToken = req.headers.get("authorization");
  if (rawToken === null) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const environment =
    req.headers.get("environment") == "hosted" ? "hosted" : "local";

  const token = environment === "hosted" ? rawToken : rawToken.split(" ")?.[1];
  if (token === undefined) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (token.length !== env.BUCKET_WEBHOOK_TOKEN.length) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const a = encoder.encode(token);
  const b = encoder.encode(env.BUCKET_WEBHOOK_TOKEN);
  if (a.byteLength !== b.byteLength || !timingSafeEqual(a, b)) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as unknown;
  const content = getInfoFromBody(body, environment);
  if (!content.success) {
    return Response.json({ message: content.message }, { status: 400 });
  }

  const { key, userId, diaryId, entryId, name } = content;

  const res = await getEntryIdByEntryAndDiaryId({
    db,
    userId,
    diaryId,
    entryId,
  });

  if (!res) {
    return Response.json({}, { status: 401 });
  }

  const image = await getImage(key);
  if (image === undefined) {
    console.log("unable to retrieve image from s3");
    const res = new Response();
    res.headers.set("Retry-After", "-1");
    return Response.json({}, { status: 500 });
  }

  if (image.compressed !== undefined) {
    return Response.json({}, { status: 201 });
  }

  const originalImageSize = image.buffer.buffer.byteLength;
  if (originalImageSize > 16000000) {
    const res = new Response();
    res.headers.set("Retry-After", "-1");
    return Response.json({}, { status: 400 });
  }

  // Generate optimized versions at multiple sizes
  const optimizedImages = await generateOptimizedSizes(
    image.buffer,
    image.mimetype,
  );

  if (optimizedImages.length === 0) {
    console.log("unable to generate optimized images");
    await createMetadataOnImageCallback({
      db,
      key,
      userId,
      mimetype: image.mimetype,
      size: originalImageSize,
      name,
      entryId,
      compressionStatus: "failure",
    });
    const res = new Response();

    // Negative to avoid retry
    // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-api-destinations.html
    res.headers.set("Retry-After", "-1");
    return res;
  }

  try {
    console.log("uploading optimized images");

    // Upload all optimized sizes in parallel
    await Promise.all(
      optimizedImages.map(({ width, buffer }) =>
        uploadImage(buffer, getOptimizedImageKey(key, width), {
          Compressed: "true",
          Width: width.toString(),
        }),
      ),
    );

    const parsedGps = getGpsMetadata(image.buffer);
    if (!parsedGps.success) {
      console.log("unable to get gps data", parsedGps.error);
      await createMetadataOnImageCallback({
        db,
        key,
        userId,
        entryId,
        mimetype: image.mimetype,
        name,
        size: originalImageSize,
        compressionStatus: "success",
      });
    } else {
      const formattedDate = formatDate(parsedGps.data.dateTimeTaken);
      const coordinates = parsedGps.data.gps;
      await createMetadataOnImageCallback({
        db,
        key,
        userId,
        entryId,
        mimetype: image.mimetype,
        name,
        size: originalImageSize,
        gps: coordinates ?? undefined,
        compressionStatus: "success",
        dateTimeTaken: formattedDate,
      });
    }
  } catch (e) {
    console.error(`unable to upload compressed image with key ${key}`, e);
  }

  return Response.json({});
}

const localInput = z.object({
  Key: z.string(),
});

const hostedInput = z.object({
  version: z.string(),
  // id: z.string().uuid(),
  // detailType: z.string(), // could be more specific if this is always "Object Created"
  // source: z.string().url(), // could validate against "aws.s3"
  // account: z.string(), // AWS account number format
  // time: z.string().datetime(), // ISO 8601 format
  // region: z.string(), // AWS region
  // resources: z.array(z.string().url()), // could validate against specific ARN pattern
  detail: z.object({
    version: z.string(),
    bucket: z.object({
      name: z.string(),
    }),
    object: z.object({
      key: z.string(),
      size: z.number(),
      etag: z.string(), // could validate against specific hash pattern
      sequencer: z.string(), // could validate against specific format
    }),
    // "request-id": z.string(),
    // requester: z.string(), // AWS account number format
    // "source-ip-address": z.string().ip(), // IP address format
    // reason: z.string(),
  }),
});

type GpsMetadataRes =
  | { success: false; error: string }
  | {
      success: true;
      data: {
        gps: { lat: number; lon: number } | null;
        dateTimeTaken: string | null;
      };
    };
function getGpsMetadata(
  buf: ArrayBuffer | Buffer | SharedArrayBuffer,
): GpsMetadataRes {
  let tags: ExifReader.ExpandedTags | undefined;
  try {
    tags = ExifReader.load(buf, { expanded: true });
  } catch (e) {
    return { success: false, error: e as string };
  }

  const gps =
    tags?.gps?.Longitude !== undefined && tags?.gps.Latitude !== undefined
      ? { lat: tags.gps.Latitude, lon: tags.gps.Longitude }
      : null;

  const dateTimeTaken = tags?.exif?.DateTimeOriginal?.description ?? null;

  return {
    success: true as const,
    data: {
      gps,
      dateTimeTaken,
    },
  };
}

type OptimizedImage = {
  width: (typeof IMAGE_SIZES)[number];
  buffer: Buffer;
};

async function generateOptimizedSizes(
  buffer: Buffer,
  mimetype: string,
): Promise<OptimizedImage[]> {
  const results: OptimizedImage[] = [];

  // Convert HEIC/HEIF to JPEG first (Sharp doesn't support HEIC natively)
  let imageBuffer: Buffer = buffer;
  if (mimetype === "image/heic" || mimetype === "image/heif") {
    try {
      const converted = await convert({
        buffer: buffer,
        format: "JPEG",
        quality: 1,
      });
      imageBuffer = Buffer.from(converted);
    } catch (e) {
      console.error(
        "Failed to convert HEIC image",
        e instanceof Error ? e.message : e,
      );
      return results;
    }
  }

  // Get original image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width ?? 0;

  for (const width of IMAGE_SIZES) {
    // Skip sizes larger than original
    if (width > originalWidth) continue;

    try {
      const optimized = await sharp(imageBuffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(width, undefined, {
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality: 65 })
        .toBuffer();

      results.push({ width, buffer: optimized });
    } catch (e) {
      console.error(`unable to generate ${width}w image`, e);
    }
  }

  return results;
}

function formatDate(date: string | null): string | undefined {
  let formattedDate: string | undefined = undefined;
  const segments = date?.split(" ");

  if (segments) {
    const date = segments[0]?.replaceAll(":", "/");
    const time = segments[1];
    if (date !== undefined && time !== undefined) {
      formattedDate = `${date} ${time}`;
    }
  }
  return formattedDate;
}

type WebhookReqBody = {
  success: true;
  key: string;
  userId: string;
  diaryId: number;
  entryId: number;
  name: string;
};

type ParsingError = {
  success: false;
  message: string;
};

function getInfoFromBody(
  body: unknown,
  environment: "hosted" | "local",
): WebhookReqBody | ParsingError {
  if (environment === "hosted") {
    const parsed = hostedInput.safeParse(body);
    if (!parsed.success) {
      console.log("invalid parsed body");
      throw new Error("invalid format");
    }

    const resource = parsed.data.detail.object.key;
    const segments = resource.split("/");
    const userId = segments[0];
    const diaryId = Number(segments[1]);
    const entryId = Number(segments[2]);
    const imageName = segments[3];
    const key = `${userId}/${diaryId}/${entryId}/${imageName}`;
    if (!entryId || !imageName || !userId) {
      return {
        success: false,
        message: "invalid format",
      };
    }

    return {
      success: true,
      key,
      userId,
      diaryId,
      entryId,
      name: imageName,
    };
  } else {
    const parsed = localInput.safeParse(body);
    if (!parsed.success) {
      return {
        success: false,
        message: "invalid format",
      };
    }
    const resource = parsed.data.Key;
    const segments = resource.split("/");
    const userId = segments[1];
    const diaryId = Number(segments[2]);
    const entryId = Number(segments[3]);
    const imageName = segments[4];
    const key = `${userId}/${diaryId}/${entryId}/${imageName}`;

    if (!entryId || !imageName || !userId) {
      return {
        success: false,
        message: "invalid format",
      };
    }

    return {
      success: true,
      key,
      userId,
      diaryId,
      entryId,
      name: imageName,
    };
  }
}
