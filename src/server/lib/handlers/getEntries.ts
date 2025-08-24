import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../repositories/entry";
import { type GetEntriesInput } from "../schema";

export async function getEntriesHandler(
  ctx: ProtectedContext,
  input: GetEntriesInput,
) {
  const entryService = new EntryService(ctx);
  return await entryService.getEntries(input.diaryId);
}
