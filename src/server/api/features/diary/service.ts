import { and, desc, eq, exists, inArray, isNotNull, isNull } from "drizzle-orm";
import {
  diaries,
  diariesToUsers,
  editorStates,
  entries,
  ImageKeys,
  imageKeys,
  posts,
} from "~/server/db/schema";
import { type TRPCContext } from "../../trpc";
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
    .where(eq(diariesToUsers.userId, userId));
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

    await tx.delete(imageKeys).where(eq(imageKeys.entryId, input.entryId));

    await tx.delete(posts).where(eq(posts.entryId, input.entryId));

    await tx.delete(entries).where(eq(entries.id, input.entryId));
  });
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
      and(eq(entries.diaryId, diaryId), eq(diariesToUsers.userId, userId)),
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
      data: JSON.parse(input.editorState),
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
      .selectDistinct({ date: entries.day })
      .from(entries)
      .where(eq(entries.diaryId, input.diaryId))
      .innerJoin(
        diariesToUsers,
        and(
          eq(diariesToUsers.diaryId, entries.diaryId),
          eq(diariesToUsers.userId, userId),
          eq(entries.day, input.day),
        ),
      );
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

export async function updateDiaryStatusToDeleting({
  db,
  diaryId,
}: {
  db: TRPCContext["db"];
  diaryId: number;
}) {
  return db
    .update(diaries)
    .set({ deleting: true })
    .where(eq(diaries.id, diaryId));
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

export async function deleteDiaryById({
  db,
  userId,
  diaryId,
}: {
  db: TRPCContext["db"];
  userId: string;
  diaryId: number;
}) {
  await db.transaction(async (tx) => {
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
          eq(diariesToUsers.userId, userId),
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

    await tx.delete(entries).where(eq(entries.diaryId, diaryId));

    await tx.delete(diaries).where(eq(diaries.id, diaryId));
  });
}

export function getImageKeysByDiaryId({
  db,
  diaryId,
}: {
  db: TRPCContext["db"];
  diaryId: number;
}) {
  return db
    .select({ Key: imageKeys.key })
    .from(imageKeys)
    .innerJoin(entries, eq(imageKeys.entryId, entries.id))
    .innerJoin(diaries, eq(entries.diaryId, diaries.id))
    .where(eq(diaries.id, diaryId));
}

export function getImageKeysByEntryId({
  db,
  entryId,
}: {
  db: TRPCContext["db"];
  entryId: number;
}) {
  return db
    .select({ Key: imageKeys.key })
    .from(imageKeys)
    .where(eq(imageKeys.entryId, entryId));
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
  userId,
  entryId,
  diaryId,
  keys,
}: {
  db: TRPCContext["db"];
  userId: string;
  entryId: number;
  diaryId: number;
  keys: string[];
}) {
  return await db
    .select({
      key: imageKeys.key,
      compressionStatus: imageKeys.compressionStatus,
    })
    .from(imageKeys)
    .innerJoin(entries, eq(entries.id, imageKeys.entryId))
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(
      and(
        eq(diariesToUsers.userId, userId),
        eq(entries.id, entryId),
        eq(diariesToUsers.diaryId, diaryId),
        isNull(imageKeys.postId),
        inArray(imageKeys.key, keys),
      ),
    );
}

export async function createPosts({
  db,
  userId,
  entryId,
  posts: postsToInsert,
}: {
  db: TRPCContext["db"];
  userId: string;
  entryId: number;
  posts: CreatePost["posts"];
}) {
  const keys = postsToInsert.map((post) => post.key);

  await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values(
        postsToInsert.map((post) => ({
          title: post.title,
          description: post.description,
          entryId: entryId,
        })),
      )
      .returning({ id: posts.id });

    // Link to post
    const sub = tx
      .select({ key: imageKeys.key })
      .from(entries)
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .innerJoin(imageKeys, eq(imageKeys.entryId, entries.id))
      .where(
        and(
          eq(diariesToUsers.userId, userId),
          isNull(imageKeys.postId),
          inArray(imageKeys.key, keys),
        ),
      );

    await tx
      .update(imageKeys)
      .set({
        postId: post!.id,
      })
      .where(inArray(imageKeys.key, sub));
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
      imageKey: imageKeys.key,
    })
    .from(posts)
    .innerJoin(imageKeys, eq(imageKeys.postId, posts.id))
    .innerJoin(entries, eq(entries.id, imageKeys.entryId))
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(and(eq(entries.id, entryId), eq(diariesToUsers.userId, userId)));
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
    .innerJoin(imageKeys, eq(imageKeys.postId, posts.id))
    .innerJoin(entries, eq(entries.id, imageKeys.entryId))
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(and(eq(entries.id, entryId), eq(diariesToUsers.userId, userId)));
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

export async function confirmImageUpload({
  db,
  key,
}: {
  db: TRPCContext["db"];
  key: string;
}) {
  return await db
    .update(imageKeys)
    .set({ linked: true })
    .where(eq(imageKeys.key, key));
}
