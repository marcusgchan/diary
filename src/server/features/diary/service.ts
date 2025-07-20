import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type {
  Diaries,
  Entries,
  ImageKeys,
  Posts,
  Users,
} from "~/server/db/schema";
import {
  diaries,
  diariesToUsers,
  editorStates,
  entries,
  imageKeys,
  posts,
} from "~/server/db/schema";
import type { TRPCContext } from "../../trpc";
import { type ProtectedContext } from "../../trpc";
import type { CreatePost, EditEntryDate, UpdateEntryTitle } from "./schema";
import { TRPCError } from "@trpc/server";
import { type db } from "~/server/db";
import { tryCatch } from "~/app/_lib/utils/tryCatch";

export async function getEntryTitleDayById({
  db,
  userId,
  entryId,
  diaryId,
}: {
  db: TRPCContext["db"];
  userId: string;
  entryId: number;
  diaryId: number;
}) {
  const [entry] = await db
    .select({ title: entries.title, day: entries.day })
    .from(entries)
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(
      and(
        eq(diariesToUsers.diaryId, diaryId),
        eq(entries.id, entryId),
        eq(diariesToUsers.userId, userId),
      ),
    )
    .limit(1);

  if (!entry) {
    return null;
  }

  return { title: entry.title ?? null, day: entry.day };
}

export async function getLinkedImageKeys({
  db,
  entryId,
}: {
  db: TRPCContext["db"];
  entryId: number;
}) {
  return await db
    .select({ key: imageKeys.key })
    .from(imageKeys)
    .leftJoin(posts, eq(posts.imageKey, imageKeys.key))
    .where(and(eq(imageKeys.entryId, entryId), isNotNull(posts.imageKey)));
}

export async function updateDiaryEntryStatusToDeleting({
  db,
  entryId,
}: {
  db: TRPCContext["db"];
  entryId: number;
}) {
  return db
    .update(entries)
    .set({ deleting: true })
    .where(eq(entries.id, entryId));
}

export class DiaryServiceRepo {
  private userId: Users["id"];
  private db: typeof db;
  private ctx: ProtectedContext;

  constructor(context: ProtectedContext) {
    this.userId = context.session.user.id;
    this.db = context.db;
    this.ctx = context;
  }

  public async flagDiaryForDeletion(diaryId: Diaries["id"]) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(diaries)
        .set({ deleting: true })
        .where(eq(diaries.id, diaryId));
      await tx
        .update(entries)
        .set({ deleting: true })
        .where(eq(entries.diaryId, diaryId));
      const keys = tx
        .select({ key: imageKeys.key })
        .from(diaries)
        .innerJoin(entries, eq(entries.diaryId, diaries.id))
        .innerJoin(imageKeys, eq(entries.id, imageKeys.entryId));
      await tx
        .update(imageKeys)
        .set({ deleting: true })
        .where(inArray(imageKeys.key, keys));
    });
  }

  public async deletePosts(entryId: Entries["id"], keys: string[]) {
    await this.db.transaction(async (tx) => {
      await tx.delete(posts).where(and(eq(posts.entryId, entryId)));
      await tx.delete(imageKeys).where(inArray(imageKeys.key, keys));
    });
  }

  public async getPosts(entryId: Entries["id"]) {
    return await this.db
      .select({
        id: posts.id,
        title: posts.title,
        description: posts.description,
        imageKey: posts.imageKey,
      })
      .from(posts)
      .innerJoin(entries, eq(entries.id, posts.entryId))
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .where(
        and(
          eq(posts.entryId, entryId),
          eq(diariesToUsers.userId, this.userId),
          eq(posts.deleting, false),
        ),
      )
      .orderBy(asc(posts.order));
  }

  public async getPostById(postId: Posts["id"]) {
    const [p] = await this.db
      .select({ postId: posts.id })
      .from(posts)
      .innerJoin(entries, eq(entries.id, posts.entryId))
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .where(and(eq(posts.id, postId), eq(diariesToUsers.userId, this.userId)))
      .limit(1);
    return p?.postId;
  }

  public async flagPostForDeletion(postId: Posts["id"]) {
    await this.db
      .update(posts)
      .set({ deleting: true })
      .where(eq(posts.id, postId));
  }

  public async deletePostById(postId: Posts["id"]) {
    await this.db.delete(posts).where(eq(posts.id, postId));
  }

  public async flagPostsToDeleteByIds(postIds: Posts["id"][]) {
    await this.db
      .update(posts)
      .set({ deleting: true })
      .where(inArray(posts.id, postIds));
  }

  public async deletePostsByIds(postIds: Posts["id"][]) {
    await this.db.delete(posts).where(inArray(posts.id, postIds));
  }

  public async deleteDiary(diaryId: Diaries["id"]) {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(editorStates)
        .where(
          inArray(
            editorStates.entryId,
            tx
              .select({ entryId: entries.id })
              .from(entries)
              .where(eq(entries.diaryId, diaryId)),
          ),
        );
      await tx
        .delete(diariesToUsers)
        .where(
          and(
            eq(diariesToUsers.diaryId, diaryId),
            eq(diariesToUsers.userId, this.userId),
          ),
        );

      await tx
        .delete(posts)
        .where(
          inArray(
            posts.entryId,
            tx
              .select({ id: entries.id })
              .from(entries)
              .where(eq(entries.diaryId, diaryId)),
          ),
        );

      await tx
        .delete(imageKeys)
        .where(
          inArray(
            imageKeys.entryId,
            tx
              .select({ id: entries.id })
              .from(entries)
              .where(eq(entries.diaryId, diaryId)),
          ),
        );

      await tx.delete(entries).where(eq(entries.diaryId, diaryId));

      await tx.delete(diaries).where(eq(diaries.id, diaryId));
    });
  }

  public async updatePostsToDeleting(entryId: Entries["id"]) {
    await this.db
      .update(posts)
      .set({ deleting: true })
      .where(eq(posts.entryId, entryId));
  }

  public async deleteFileByKey(key: string) {
    const [err] = await tryCatch(
      this.db.transaction(async (tx) => {
        await tx
          .update(posts)
          .set({ imageKey: null })
          .where(eq(posts.imageKey, key));
        await tx.delete(imageKeys).where(eq(imageKeys.key, key));
      }),
    );
    console.log(err);
    if (err) {
      this.ctx.log(
        "deleteFileByKey",
        "warn",
        "unable to delete file by key: " + err.message,
      );
      throw new Error("unable to delete file by key", { cause: err });
    }
  }

  public async upsertPosts(
    entryId: Entries["id"],
    postsToInsert: (CreatePost["posts"][number] & { id?: Posts["id"] })[],
  ) {
    const query = this.db
      .insert(posts)
      .values(
        postsToInsert.map((post, index) => {
          return {
            ...(post.id && { id: post.id }),
            entryId: entryId,
            title: post.title,
            imageKey: post.key,
            description: post.description,
            isSelected: post.isSelected,
            order: index,
          };
        }),
      )
      .onConflictDoUpdate({
        target: posts.id,
        set: {
          title: sql.raw(`excluded.${posts.title.name}`),
          imageKey: sql.raw(`excluded."${posts.imageKey.name}"`),
          description: sql.raw(`excluded.${posts.description.name}`),
          isSelected: sql.raw(`excluded.${posts.isSelected.name}`),
          order: sql.raw(`excluded.${posts.order.name}`),
        },
      })
      .returning({ id: posts.id });
    const [err] = await tryCatch(query);
    if (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create posts",
      });
    }
  }
}

export async function updateDiaryEntryStatusToNotDeleting({
  db,
  entryId,
}: {
  db: TRPCContext["db"];
  entryId: number;
}) {
  return db
    .update(entries)
    .set({ deleting: false })
    .where(eq(entries.id, entryId));
}

export async function updateTitle({
  db,
  userId,
  input,
}: {
  db: TRPCContext["db"];
  userId: string;
  input: UpdateEntryTitle;
}) {
  await db
    .update(entries)
    .set({ title: input.title })
    .where(
      and(
        eq(entries.diaryId, input.diaryId),
        eq(entries.id, input.entryId),
        eq(
          entries.diaryId,
          db
            .selectDistinct({ diaryId: diariesToUsers.diaryId })
            .from(diariesToUsers)
            .where(
              and(
                eq(diariesToUsers.diaryId, entries.diaryId),
                eq(diariesToUsers.userId, userId),
              ),
            ),
        ),
      ),
    );
}

export async function getEntryIdByDate({
  db,
  userId,
  input,
}: {
  db: TRPCContext["db"];
  userId: string;
  input: { diaryId: number; entryId: number; day: string };
}) {
  const [entriesWithSameDateAsInput] = await db
    .selectDistinct({
      id: entries.id,
    })
    .from(entries)
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(
      and(
        eq(entries.diaryId, input.diaryId),
        eq(entries.day, input.day),
        eq(diariesToUsers.userId, userId),
      ),
    );
  return entriesWithSameDateAsInput;
}

export async function updateEntryDate({
  db,
  userId,
  input,
}: {
  db: TRPCContext["db"];
  userId: string;
  input: EditEntryDate;
}) {
  await db
    .update(entries)
    .set({ day: input.day })
    .where(
      and(
        eq(entries.id, input.entryId),
        eq(
          entries.diaryId,
          db
            .selectDistinct({ diaryId: diariesToUsers.diaryId })
            .from(diariesToUsers)
            .where(
              and(
                eq(diariesToUsers.diaryId, entries.diaryId),
                eq(diariesToUsers.userId, userId),
              ),
            ),
        ),
      ),
    );
}

export async function getDiaryIdById({
  db,
  userId,
  diaryId,
}: {
  db: TRPCContext["db"];
  userId: string;
  diaryId: number;
}) {
  const [diary] = await db
    .select({ id: diaries.id })
    .from(diaries)
    .innerJoin(diariesToUsers, eq(diaries.id, diariesToUsers.diaryId))
    .where(
      and(
        eq(diariesToUsers.diaryId, diaryId),
        eq(diariesToUsers.userId, userId),
      ),
    );
  return diary;
}

export async function updateDiaryStatusToNotDeleting({
  db,
  diaryId,
}: {
  db: TRPCContext["db"];
  diaryId: number;
}) {
  return db
    .update(diaries)
    .set({ deleting: false })
    .where(eq(diaries.id, diaryId));
}

export async function insertImageMetadata({
  db,
  userId,
  entryId,
  key,
  dateTimeTaken,
  gps,
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
      entryId,
      name: "",
      mimetype: "",
      size: 0,
      lat: gps?.lat,
      lon: gps?.lon,
      isSelected: false, // add for now but journal section doesn't have selected for images
      datetimeTaken:
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
  isSelected,
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
  isSelected: boolean;
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
      name,
      mimetype,
      size,
      entryId,
      lat: gps?.lat,
      lon: gps?.lon,
      isSelected,
      compressionStatus: compressionStatus,
      datetimeTaken:
        dateTimeTaken !== undefined ? new Date(dateTimeTaken) : undefined,
    })
    .onConflictDoNothing();
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
    .innerJoin(entries, eq(entries.id, imageKeys.entryId))
    .leftJoin(posts, eq(posts.imageKey, imageKeys.key))
    .where(
      and(
        eq(entries.id, entryId),
        isNull(posts.imageKey),
        inArray(imageKeys.key, keys),
      ),
    );
}

export async function deletePosts({
  db,
  entryId,
}: {
  db: TRPCContext["db"];
  entryId: number;
}) {
  await db.transaction(async (tx) => {
    await tx.delete(posts).where(eq(posts.entryId, entryId));
    await tx.delete(imageKeys).where(eq(imageKeys.entryId, entryId));
  });
}

export async function setCompressionStatus({
  db,
  key,
  compressionStatus,
}: {
  db: TRPCContext["db"];
  key: string;
  compressionStatus: ImageKeys["compressionStatus"];
}) {
  return db
    .update(imageKeys)
    .set({ compressionStatus })
    .where(eq(imageKeys.key, key));
}

export async function insertImageMetadataWithGps({
  db,
  entryId,
  lat,
  lon,
  key,
  dateTimeTaken,
}: {
  db: TRPCContext["db"];
  userId: string;
  entryId: number;
  key: string;
  lat: number;
  lon: number;
  dateTimeTaken: string | undefined;
}) {
  return db.insert(imageKeys).values({
    key,
    name: "",
    mimetype: "",
    size: 0,
    entryId,
    lat,
    lon,
    isSelected: false, // add for now but journal section doesn't have selected for images
    datetimeTaken:
      dateTimeTaken !== undefined ? new Date(dateTimeTaken) : undefined,
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

export async function getKeyByKey({
  db,
  key,
  userId,
}: {
  db: TRPCContext["db"];
  userId: string;
  key: string;
}) {
  return await db
    .select({ key: imageKeys.key })
    .from(imageKeys)
    .innerJoin(entries, eq(entries.id, imageKeys.entryId))
    .innerJoin(diariesToUsers, eq(entries.diaryId, diariesToUsers.diaryId))
    .where(and(eq(imageKeys.key, key), eq(diariesToUsers.userId, userId)));
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
