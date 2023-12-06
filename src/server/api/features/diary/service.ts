import { and, desc, eq, exists, inArray, sql } from "drizzle-orm";
import {
  diaries,
  diariesToUsers,
  editorStates,
  entries,
} from "~/server/db/schema";
import { type TRPCContext } from "../../trpc";
import {
  CreateEntry,
  DeleteEntryInput,
  EditDiaryName,
  EditEntryDate,
  GetEntryInput,
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
    const [inserted] = await tx.insert(diaries).values({ name: name });
    await tx.insert(diariesToUsers).values({
      userId: userId,
      diaryId: inserted.insertId,
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

export async function deleteEntry({
  db,
  userId,
  input,
}: {
  db: TRPCContext["db"];
  userId: string;
  input: DeleteEntryInput;
}) {
  const query = sql`
    DELETE E FROM diary_entry as E
    INNER JOIN diary_diary_to_user as DU
    ON DU.diaryId = E.diaryId
    AND DU.userId = ${userId}
    WHERE E.id = ${input.entryId}
  `;
  await db.execute(query);
}

export async function getEntry({
  db,
  userId,
  input,
}: {
  db: TRPCContext["db"];
  userId: string;
  input: GetEntryInput;
}) {
  const [entry] = await db
    .selectDistinct({
      id: entries.id,
      day: entries.day,
      editorState: editorStates.data,
      lastUpdatedEditorState: editorStates.updatedAt,
      title: entries.title,
    })
    .from(entries)
    .leftJoin(editorStates, eq(editorStates.entryId, entries.id))
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(
      and(
        eq(entries.diaryId, input.diaryId),
        eq(entries.id, input.entryId),
        eq(diariesToUsers.userId, userId),
      ),
    );
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
      .values({ diaryId: input.diaryId, day: input.day });

    // Create editor state
    await tx.insert(editorStates).values({ entryId: insertedEntry.insertId });

    return { id: insertedEntry.insertId };
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

    await tx.delete(entries).where(eq(entries.diaryId, diaryId));

    await tx.delete(diaries).where(eq(diaries.id, diaryId));
  });
}
