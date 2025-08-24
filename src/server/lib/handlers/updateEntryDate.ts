import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { editEntryDateSchema } from "../schema";

export async function updateEntryDateHandler(
  ctx: ProtectedContext,
  input: typeof editEntryDateSchema._type,
): Promise<{ diaryId: number; entryId: number; day: string }> {
  const entryService = new EntryService(ctx);
  const id = await entryService.getEntryIdByDate(input);

  if (id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Entry with this date already exists",
    });
  }

  await entryService.updateEntryDate(input);
  return { diaryId: input.diaryId, entryId: input.entryId, day: input.day };
}
