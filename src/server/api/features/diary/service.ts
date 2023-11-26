import { and, desc, eq, exists, sql } from "drizzle-orm";
import { diaries, diariesToUsers, entries } from "~/server/db/schema";
import { type TRPCContext } from "../../trpc";
import {
  DeleteEntryInput,
  EditEntryDate,
  GetEntryInput,
  UpdateEntryTitle,
} from "./schema";

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
      editorState: entries.editorState,
      title: entries.title,
    })
    .from(entries)
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

export async function editEntryDate({
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
