import { z } from "zod";
import { env } from "~/env.mjs";
import { timingSafeEqual } from "crypto";
import { db } from "~/server/db";
import { diariesToUsers, entries } from "~/server/db/schema";
import { eq, and } from "drizzle-orm/sql";
import { insertImageMetadata } from "~/server/api/features/diary/service";

const input = z.object({
  Key: z.string(),
});

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.split(" ")?.[1];
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
  const parsed = input.safeParse(body);
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

  const res = await db
    .select({ entryId: entries.id })
    .from(diariesToUsers)
    .innerJoin(entries, eq(entries.diaryId, diariesToUsers.diaryId))
    .where(
      and(eq(diariesToUsers.userId, userId), eq(entries.id, Number(entryId))),
    );

  if (res.length === 0) {
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
