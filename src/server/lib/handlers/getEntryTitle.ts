import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { type GetEntryTitleInput } from "../schema";

export async function getEntryTitleHandler(
  ctx: ProtectedContext,
  input: GetEntryTitleInput,
): Promise<string> {
  const entryService = new EntryService(ctx);
  const [title] = await entryService.getEntryTitle(input.entryId);

  if (title === undefined) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return title.title;
}
