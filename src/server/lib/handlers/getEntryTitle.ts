import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";

export async function getEntryTitleHandler(
  ctx: ProtectedContext,
  input: { entryId: number },
): Promise<string> {
  const entryService = new EntryService(ctx);
  const [title] = await entryService.getEntryTitle(input.entryId);

  if (title === undefined) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return title.title;
}
