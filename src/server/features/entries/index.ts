export { EntryDomainService } from "./service";

import { and, eq } from "drizzle-orm";
import { diariesToUsers, entries } from "~/server/db/schema";

// Re-export the functions needed for API routes
export async function getEntryIdByEntryAndDiaryId({
  db,
  userId,
  entryId,
  diaryId,
}: {
  db: any;
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
