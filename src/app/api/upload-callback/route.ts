import { z } from "zod";
import { env } from "~/env.mjs";
import { timingSafeEqual } from "crypto";
import { db } from "~/server/db";
import {
  getEntryIdByEntryAndDiaryId,
  getImageUploadStatus,
  receivedImageWebhook,
} from "~/server/api/features/diary/service";
import {
  getImage,
  uploadImage,
} from "~/server/api/features/shared/s3ImagesService";
import sharp from "sharp";

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

export async function POST(req: Request) {
  console.log("received webhook")
  await new Promise((res) => setTimeout(res, 5000));

  const rawToken = req.headers.get("authorization");
  if (rawToken === null) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const environment = req.headers.get("environment");

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

  const body = await req.json();
  if (environment === "hosted") {
    console.log("hosted")
    console.log(body)
    const parsed = hostedInput.safeParse(body);
    if (!parsed.success) {
      console.log("invalid parsed body")
      return Response.json({ message: "Invalid format" }, { status: 400 });
    }

    const resource = parsed.data.detail.object.key;
    const segments = resource.split("/");
    const userId = segments[0];
    const diaryId = Number(segments[1]);
    const entryId = Number(segments[2]);
    const imageName = segments[3];
    const key = `${userId}/${diaryId}/${entryId}/${imageName}`;

    if (!entryId || !imageName || !userId) {
      console.log("invalid key")
      return Response.json({ message: "Bad request" }, { status: 400 });
    }

    const res = await getEntryIdByEntryAndDiaryId({
      db,
      userId,
      diaryId,
      entryId,
    });

    if (!res) {
      console.log("dis entry doesn't exist")
      return Response.json({}, { status: 401 });
    }
    const uploaded = await getImageUploadStatus({ db, key });
    if (uploaded) {
      console.log("image uploaded already with key", key)
      return Response.json({}, { status: 201 });
    }

    const imgBuf = await getImage(resource);
    if (imgBuf === undefined) {
      console.log("unable to retrieve image from s3");
      return Response.json({}, { status: 500 });
    }

    const compressImageBuf = await compressImage(imgBuf);
    if (compressImageBuf === undefined) {
      console.log("unable to compress image");
      return Response.json({}, { status: 500 });
    }

    try {
      console.log("uploading image")
      await uploadImage(imgBuf, key);
    } catch (e) {
      console.error(`unable to upload compressed image with key ${resource}`);
    }

    try {
      console.log("key: ", key)
      await receivedImageWebhook({
        db,
        key,
        compressionStatus: "uncompressed",
      });
    } catch (e) {
      console.error(`unable to update image key (${resource}) status to received`);
    }

    return Response.json({});
  } else {
    const parsed = localInput.safeParse(body);
    if (!parsed.success) {
      return Response.json({ message: "Invalid format" }, { status: 400 });
    }
    const resource = parsed.data.Key;
    const segments = resource.split("/");
    const userId = segments[1];
    const diaryId = Number(segments[2]);
    const entryId = Number(segments[3]);
    const imageName = segments[4];

    if (!entryId || !imageName || !userId) {
      return Response.json({ message: "Bad request" }, { status: 400 });
    }

    const res = await getEntryIdByEntryAndDiaryId({
      db,
      userId,
      diaryId,
      entryId,
    });

    if (!res) {
      return Response.json({}, { status: 401 });
    }

    const key = `${userId}/${diaryId}/${entryId}/${imageName}`;

    const uploaded = await getImageUploadStatus({ db, key });
    if (uploaded) {
      return Response.json({}, { status: 201 });
    }

    const imgBuf = await getImage(key);
    if (imgBuf === undefined) {
      console.log("unable to retrieve image from s3");
      return Response.json({}, { status: 500 });
    }

    const compressImageBuf = await compressImage(imgBuf);
    if (compressImageBuf === undefined) {
      console.log("unable to compress image");
      return Response.json({}, { status: 500 });
    }

    try {
      await uploadImage(compressImageBuf, key);
    } catch (e) {
      console.error(`unable to upload compressed image with key ${resource}`);
    }

    try {
      await receivedImageWebhook({
        db,
        key,
        compressionStatus: "uncompressed",
      });
    } catch (e) {
      console.error(
        `unable to update image key (${resource}) status to received`,
      );
    }

    return Response.json({});
  }
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
