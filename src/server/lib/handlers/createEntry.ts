import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../repositories/entry";
import { createEntrySchema } from "../schema";

export async function createEntryHandler(
  ctx: ProtectedContext,
  input: typeof createEntrySchema._type,
) {
  const entryService = new EntryService(ctx);
  return await entryService.createEntry(input);
}
