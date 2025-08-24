import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../repositories/entry";
import { type GetEntryInput } from "../schema";

export async function getEntryHandler(
  ctx: ProtectedContext,
  input: GetEntryInput,
) {
  const entryService = new EntryService(ctx);
  return await entryService.getEntry(input.entryId);
}
