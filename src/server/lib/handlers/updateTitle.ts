import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../repositories/entry";
import { updateEntryTitleSchema } from "../schema";

export async function updateTitleHandler(
  ctx: ProtectedContext,
  input: typeof updateEntryTitleSchema._type,
): Promise<string> {
  const entryService = new EntryService(ctx);
  await entryService.updateTitle(input);
  return input.title;
}
