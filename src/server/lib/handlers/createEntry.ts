import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../repositories/entry";
import { type CreateEntry } from "../schema";

export async function createEntryHandler(
  ctx: ProtectedContext,
  input: CreateEntry,
) {
  const entryService = new EntryService(ctx);
  return await entryService.createEntry(input);
}
