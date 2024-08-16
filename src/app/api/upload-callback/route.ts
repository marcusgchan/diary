import { z } from "zod";
import { env } from "~/env.mjs";
import { timingSafeEqual } from "crypto";
import { db } from "~/server/db";
import { diariesToUsers, entries } from "~/server/db/schema";
import { eq, and } from "drizzle-orm/sql";
import { insertImageMetadata } from "~/server/api/features/diary/service";

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
    console.log("hosted");
    const parsed = hostedInput.safeParse(body);
    if (!parsed.success) {
      console.log(parsed.error);
      return Response.json({ message: "Invalid format" }, { status: 400 });
    }

    const key = parsed.data.detail.object.key;
    const segments = key.split("/");
    const userId = segments[0];
    const entryId = segments[2];
    const imageName = segments[3];
    console.log(key);

    if (!entryId || !imageName || !userId) {
      return Response.json({ message: "Bad request" }, { status: 400 });
    }

    console.log("Inserting into image keys");

    await insertImageMetadata({
      db,
      userId,
      entryId: Number(entryId),
      key: key,
    });

    return Response.json({});
  } else {
    console.log("local");
    const parsed = localInput.safeParse(body);
    if (!parsed.success) {
      return Response.json({ message: "Invalid format" }, { status: 400 });
    }
    const key = parsed.data.Key;
    const segments = key.split("/");
    const userId = segments[1];
    const entryId = segments[3];
    const imageName = segments[4];

    if (!entryId || !imageName || !userId) {
      return Response.json({ message: "Bad request" }, { status: 400 });
    }

    const firstSlash = key.indexOf("/");

    await insertImageMetadata({
      db,
      userId,
      entryId: Number(entryId),
      key: key.slice(firstSlash + 1),
    });

    return Response.json({});
  }
}
