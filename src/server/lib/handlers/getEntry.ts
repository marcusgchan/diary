import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../repositories/entry";

export async function getEntryHandler(
  ctx: ProtectedContext,
  input: { diaryId: number; entryId: number },
) {
  const entryService = new EntryService(ctx);
  return await entryService.getEntry(input.entryId);
}
