import {
  and,
  asc,
  desc,
  eq,
  exists,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import {
  Diaries,
  diaries,
  diariesToUsers,
  EditorStates,
  editorStates,
  Entries,
  entries,
  ImageKeys,
  imageKeys,
  Posts,
  posts,
  Users,
} from "~/server/db/schema";
import { ProtectedContext, type TRPCContext } from "../../trpc";
import {
  CreateEntry,
  CreatePost,
  DeleteEntryInput,
  EditDiaryName,
  EditEntryDate,
  SaveEditorState,
  UpdateEntryTitle,
} from "./schema";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { tryCatch } from "~/app/_utils/tryCatch";

export async function getDiaries({
  db,
  userId,
}: {
  db: TRPCContext["db"];
  userId: string;
}) {
  const diariesList = await db
    .select({ id: diaries.id, name: diaries.name })
    .from(diariesToUsers)
    .innerJoin(diaries, eq(diaries.id, diariesToUsers.diaryId))
    .where(and(eq(diariesToUsers.userId, userId), eq(diaries.deleting, false)));
  return diariesList;
}

export async function createDiary({
  db,
  userId,
  name,
}: {
  db: TRPCContext["db"];
  userId: string;
  name: string;
}) {
  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(diaries)
      .values({ name: name })
      .returning({ insertedId: diaries.id });
    await tx.insert(diariesToUsers).values({
      userId: userId,
      diaryId: inserted!.insertedId,
    });
  });
}

export async function editDiaryName({
  db,
  input,
}: {
  db: TRPCContext["db"];
  input: EditDiaryName;
}) {
  await db
    .update(diaries)
    .set({ name: input.name })
    .where(eq(diaries.id, input.diaryId));
}

export async function getEntryIdById({
  db,
  userId,
  entryId,
}: {
  db: TRPCContext["db"];
  userId: string;
  entryId: number;
}) {
  const [entry] = await db
    .select({ id: entries.id })
    .from(entries)
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(
      and(
        eq(entries.id, entryId),
        eq(diariesToUsers.userId, userId),
        eq(diariesToUsers.diaryId, entries.diaryId),
      ),
    );
  return entry;
}

export async function getEntryIdByEntryAndDiaryId({
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
    .select({ id: entries.id })
    .from(entries)
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(
      and(
        eq(entries.id, entryId),
        eq(diariesToUsers.userId, userId),
        eq(diariesToUsers.diaryId, diaryId),
      ),
    );
  return entry;
}

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

export async function deleteEntry({
  db,
  input,
}: {
  db: TRPCContext["db"];
  input: DeleteEntryInput;
}) {
  await db.transaction(async (tx) => {
    await tx
      .delete(editorStates)
      .where(eq(editorStates.entryId, input.entryId));

    await tx.delete(posts).where(eq(posts.entryId, input.entryId));

    await tx.delete(imageKeys).where(eq(imageKeys.entryId, input.entryId));

    await tx.delete(entries).where(eq(entries.id, input.entryId));
  });
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

  public async flagEntryForDeletion(entryId: Entries["id"]) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(entries)
        .set({ deleting: true })
        .where(eq(entries.id, entryId));
      await tx
        .update(imageKeys)
        .set({ deleting: true })
        .where(eq(imageKeys.entryId, entryId));
    });
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
            description: post.description,
            imageKey: post.key,
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

export async function getEntry({
  db,
  userId,
  entryId,
}: {
  db: TRPCContext["db"];
  userId: string;
  entryId: number;
}) {
  const [entry] = await db
    .select({
      id: entries.id,
      day: entries.day,
      editorState: editorStates.data,
      lastUpdatedEditorState: editorStates.updatedAt,
      title: entries.title,
    })
    .from(entries)
    .leftJoin(editorStates, eq(editorStates.entryId, entries.id))
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(and(eq(entries.id, entryId), eq(diariesToUsers.userId, userId)));

  return entry ?? null;
}

export async function getEntries({
  db,
  userId,
  diaryId,
}: {
  db: TRPCContext["db"];
  userId: string;
  diaryId: number;
}) {
  const entriesList = await db
    .select({
      id: entries.id,
      day: entries.day,
      title: entries.title,
      diaryId: entries.diaryId,
    })
    .from(entries)
    .orderBy(desc(entries.day))
    .innerJoin(diaries, eq(diaries.id, entries.diaryId))
    .innerJoin(diariesToUsers, eq(diaries.id, diariesToUsers.diaryId))
    .where(
      and(
        eq(entries.diaryId, diaryId),
        eq(diariesToUsers.userId, userId),
        eq(entries.deleting, false),
      ),
    );
  return entriesList;
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

export async function getEntryIdsByDate({
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

export async function saveEditorState({
  db,
  userId,
  input,
}: {
  db: TRPCContext["db"];
  userId: string;
  input: SaveEditorState;
}) {
  await db
    .update(editorStates)
    .set({
      data: JSON.parse(input.editorState) as EditorStates["data"],
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(editorStates.entryId, input.entryId),
        exists(
          db
            .selectDistinct({ diaryId: diariesToUsers.diaryId })
            .from(diariesToUsers)
            .where(
              and(
                eq(diariesToUsers.diaryId, input.diaryId),
                eq(diariesToUsers.userId, userId),
              ),
            ),
        ),
      ),
    );
}

export async function createEntry({
  db,
  userId,
  input,
}: {
  db: TRPCContext["db"];
  userId: string;
  input: CreateEntry;
}) {
  // Turn into transaction
  return await db.transaction(async (tx) => {
    const res = await tx
      .select({ date: entries.day })
      .from(entries)
      .where(eq(entries.diaryId, input.diaryId))
      .innerJoin(
        diariesToUsers,
        and(
          eq(diariesToUsers.diaryId, entries.diaryId),
          eq(diariesToUsers.userId, userId),
          eq(entries.day, input.day),
          eq(entries.deleting, false),
        ),
      )
      .limit(1);
    // Only can have 1 entry per day
    if (res.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Entry already exists",
      });
    }
    const [insertedEntry] = await tx
      .insert(entries)
      .values({ diaryId: input.diaryId, day: input.day })
      .returning({ insertedId: entries.id });

    // Create editor state
    await tx
      .insert(editorStates)
      .values({ entryId: insertedEntry!.insertedId });

    return { id: insertedEntry!.insertedId };
  });
}

export async function getDiaryById({
  db,
  userId,
  diaryId,
}: {
  db: TRPCContext["db"];
  userId: string;
  diaryId: number;
}) {
  const [diary] = await db
    .select({ id: diaries.id, name: diaries.name })
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

export async function getImageKeysByDiaryId({
  db,
  diaryId,
}: {
  db: TRPCContext["db"];
  diaryId: number;
}) {
  const query = await db
    .select({ key: imageKeys.key })
    .from(imageKeys)
    .innerJoin(entries, eq(imageKeys.entryId, entries.id))
    .innerJoin(diaries, eq(entries.diaryId, diaries.id))
    .where(eq(diaries.id, diaryId));

  return query.map(({ key }) => key);
}

export async function getImageKeysByEntryId({
  db,
  entryId,
}: {
  db: TRPCContext["db"];
  entryId: number;
}) {
  const query = await db
    .select({ key: imageKeys.key })
    .from(imageKeys)
    .where(eq(imageKeys.entryId, entryId));

  return query.map(({ key }) => key);
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

export async function setPostsToDeleting() {}

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

export async function getPosts({
  db,
  entryId,
  userId,
}: {
  db: TRPCContext["db"];
  entryId: number;
  userId: string;
}) {
  return await db
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
        eq(diariesToUsers.userId, userId),
        eq(posts.deleting, false),
      ),
    )
    .orderBy(asc(posts.order));
}

export async function getPostsForForm({
  db,
  entryId,
  userId,
}: {
  db: TRPCContext["db"];
  entryId: number;
  userId: string;
}) {
  return await db
    .select({
      id: posts.id,
      title: posts.title,
      description: posts.description,
      imageKey: imageKeys.key,
      name: imageKeys.name,
      mimetype: imageKeys.mimetype,
      size: imageKeys.size,
    })
    .from(posts)
    .leftJoin(imageKeys, eq(imageKeys.key, posts.imageKey))
    .innerJoin(entries, eq(entries.id, posts.entryId))
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(
      and(
        eq(entries.id, entryId),
        eq(diariesToUsers.userId, userId),
        eq(posts.deleting, false),
      ),
    );
}

export async function getEntryHeader({
  db,
  userId,
  entryId,
}: {
  db: TRPCContext["db"];
  userId: string;
  entryId: number;
}) {
  return await db
    .select({
      day: entries.day,
      title: entries.title,
    })
    .from(entries)
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(and(eq(entries.id, entryId), eq(diariesToUsers.userId, userId)))
    .limit(1);
}

export async function getEntryTitle({
  db,
  userId,
  entryId,
}: {
  db: TRPCContext["db"];
  userId: string;
  entryId: number;
}) {
  return await db
    .select({
      title: entries.title,
    })
    .from(entries)
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(and(eq(entries.id, entryId), eq(diariesToUsers.userId, userId)))
    .limit(1);
}

export async function getEntryDay({
  db,
  userId,
  entryId,
}: {
  db: TRPCContext["db"];
  userId: string;
  entryId: number;
}) {
  return await db
    .select({
      day: entries.day,
    })
    .from(entries)
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(and(eq(entries.id, entryId), eq(diariesToUsers.userId, userId)))
    .limit(1);
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
