import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../repositories/entry";
import { type UpdateEntryTitle } from "../schema";

export async function updateTitleHandler(
  ctx: ProtectedContext,
  input: UpdateEntryTitle,
): Promise<string> {
  const entryService = new EntryService(ctx);
  await entryService.updateTitle(input);
  return input.title;
}
