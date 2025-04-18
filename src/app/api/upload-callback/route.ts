import { z } from "zod";
import { env } from "~/env.mjs";
import { timingSafeEqual } from "crypto";
import { db } from "~/server/db";
import {
  createMetadataOnImageCallback,
} from "~/server/features/diary/service";
import { getEntryIdByEntryAndDiaryId } from "~/server/features/diary/services/entry";
import { getImage, uploadImage } from "~/server/features/shared/s3ImagesService";
import sharp from "sharp";
import ExifReader from "exifreader";
import { getCompressedImageKey } from "~/app/_lib/utils/getCompressedImageKey";

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

  const compressImageBuf = await compressImage(image.buffer);

  if (compressImageBuf === undefined) {
    console.log("unable to compress image");
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
    console.log("uploading image");

    await uploadImage(image.buffer, getCompressedImageKey(key), {
      Compressed: "true",
    });

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
      await createMetadataOnImageCallback({
        db,
        key,
        userId,
        entryId,
        mimetype: image.mimetype,
        name,
        size: originalImageSize,
        gps:
          parsedGps.data.gps?.lon !== undefined &&
          parsedGps.data.gps.lat !== undefined
            ? { lat: parsedGps.data.gps.lat, lon: parsedGps.data.gps.lon }
            : undefined,
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

async function compressImage(buffer: Buffer): Promise<Buffer | undefined> {
  try {
    const compressed = await sharp(buffer)
      .resize(500)
      .webp({ quality: 70 })
      .toBuffer();
    return compressed;
  } catch (e) {
    console.error("unable to compress image", e);
  }
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
