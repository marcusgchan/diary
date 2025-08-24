import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { DiaryService } from "../repositories/diary";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { type DeleteDiaryInput } from "../schema";

export async function deleteDiaryHandler(
  ctx: ProtectedContext,
  input: DeleteDiaryInput,
): Promise<number> {
  const diaryService = new DiaryService(ctx);

  // Check if diary exists
  const diaryId = await diaryService.getDiaryIdById(input.diaryId);
  if (!diaryId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Diary does not exist",
    });
  }

  // Delete the diary
  const [err] = await tryCatch(diaryService.deleteDiary(input.diaryId));
  if (err) {
    ctx.log(
      "deleteDiary",
      "warn",
      "unable to delete entry from database: " + err.message,
    );
  }

  return input.diaryId;
}
