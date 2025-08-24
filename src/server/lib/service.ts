import { and, eq, inArray, not } from "drizzle-orm";
import type { ImageKeys } from "~/server/db/schema";
import {
  diariesToUsers,
  entries,
  geoData,
  imageKeys,
  postImages,
  posts,
} from "~/server/db/schema";
import type { TRPCContext } from "../trpc";
import { TRPCError } from "@trpc/server";

export async function insertImageMetadata({
  db,
  userId,
  entryId,
  key,
  dateTimeTaken,
}: {
  db: TRPCContext["db"];
  userId: string;
  entryId: number;
  key: string;
  gps?: { lat: number; lon: number };
  dateTimeTaken?: string | undefined;
}) {
  const res = await db
    .select({ entryId: entries.id })
    .from(diariesToUsers)
    .innerJoin(entries, eq(entries.diaryId, diariesToUsers.diaryId))
    .where(and(eq(diariesToUsers.userId, userId), eq(entries.id, entryId)));

  if (res.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  await db
    .insert(imageKeys)
    .values({
      key,
      name: "",
      mimetype: "",
      userId,
      size: 0,
      takenAt:
        dateTimeTaken !== undefined ? new Date(dateTimeTaken) : undefined,
    })
    .onConflictDoNothing();
}

export async function createMetadataOnImageCallback({
  db,
  userId,
  entryId,
  key,
  name,
  mimetype,
  size, // bytes
  dateTimeTaken,
  compressionStatus,
  gps,
}: {
  db: TRPCContext["db"];
  userId: string;
  entryId: number;
  key: string;
  name: string;
  mimetype: string;
  size: number;
  gps?: { lat: number; lon: number };
  compressionStatus: ImageKeys["compressionStatus"];
  dateTimeTaken?: string | undefined;
}) {
  const res = await db
    .select({ entryId: entries.id })
    .from(diariesToUsers)
    .innerJoin(entries, eq(entries.diaryId, diariesToUsers.diaryId))
    .where(and(eq(diariesToUsers.userId, userId), eq(entries.id, entryId)));

  if (res.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(imageKeys)
      .values({
        key,
        name,
        mimetype,
        size,
        userId,
        compressionStatus: compressionStatus,
        takenAt:
          dateTimeTaken !== undefined ? new Date(dateTimeTaken) : undefined,
      })
      .onConflictDoNothing();

    if (gps) {
      await tx.insert(geoData).values({
        key,
        lat: gps?.lat,
        lon: gps?.lon,
      });
    }
  });
}

export async function getUnlinkedImages({
  db,
  entryId,
  keys,
}: {
  db: TRPCContext["db"];
  entryId: number;
  keys: string[];
}) {
  return await db
    .select({
      key: imageKeys.key,
      compressionStatus: imageKeys.compressionStatus,
    })
    .from(imageKeys)
    .where(
      and(
        not(
          inArray(
            imageKeys.key,
            db
              .select({ key: postImages.imageKey })
              .from(postImages)
              .innerJoin(posts, eq(posts.id, postImages.postId))
              .where(eq(posts.entryId, entryId)),
          ),
        ),
        inArray(imageKeys.key, keys),
      ),
    );
}

export async function insertImageMetadataWithGps({
  db,
  userId,
  lat,
  lon,
  key,
  dateTimeTaken,
}: {
  db: TRPCContext["db"];
  userId: string;
  key: string;
  lat: number;
  lon: number;
  dateTimeTaken: string | undefined;
}) {
  await db.transaction(async (tx) => {
    await tx.insert(imageKeys).values({
      key,
      name: "",
      compressionStatus: "failure",
      mimetype: "",
      size: 0,
      userId,
      takenAt:
        dateTimeTaken !== undefined ? new Date(dateTimeTaken) : undefined,
    });

    await tx.insert(geoData).values({
      key,
      lat,
      lon,
    });
  });
}

export class DeleteImageMetadataError extends Error {
  constructor(msg?: string, options?: ErrorOptions) {
    super(msg, options);
    this.name = DeleteImageMetadataError.name;
  }
}
export async function deleteImageMetadata({
  db,
  key,
}: {
  db: TRPCContext["db"];
  key: string;
}) {
  try {
    await db.delete(imageKeys).where(eq(imageKeys.key, key));
  } catch (e) {
    throw new DeleteImageMetadataError("unable to delete image metadata", {
      cause: e,
    });
  }
}

export async function getImageUploadStatus({
  db,
  key,
}: {
  db: TRPCContext["db"];
  key: string;
}) {
  const res = await db
    .select({ key: imageKeys.key })
    .from(imageKeys)
    .where(eq(imageKeys.key, key))
    .limit(1);

  return res.length > 0 ? "uploaded" : "pending";
}

export async function cancelImageUpload({
  db,
  key,
}: {
  db: TRPCContext["db"];
  key: string;
}) {
  return db.delete(imageKeys).where(eq(imageKeys.key, key));
}

// TODO: need to refactor upload for journal
export function confirmImageUpload({
  db: _db,
  key: _key,
}: {
  db: TRPCContext["db"];
  key: string;
}) {
  return;
  // return await db
  //   .update(imageKeys)
  //   .set({ linked: true })
  //   .where(eq(imageKeys.key, key));
}
