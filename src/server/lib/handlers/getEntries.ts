import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../repositories/entry";

export async function getEntriesHandler(
  ctx: ProtectedContext,
  input: { diaryId: number },
) {
  const entryService = new EntryService(ctx);
  return await entryService.getEntries(input.diaryId);
}
