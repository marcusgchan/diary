import { and, desc, eq, sql } from "drizzle-orm";
import { diaries, diariesToUsers, entries } from "~/server/db/schema";
import { type TRPCContext } from "../../trpc";
import { DeleteEntryInput, GetEntryInput } from "./schema";

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
