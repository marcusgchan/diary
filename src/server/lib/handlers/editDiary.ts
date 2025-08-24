import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { DiaryService } from "../repositories/diary";
import { type EditDiaryName } from "../schema";

export async function editDiaryHandler(
  ctx: ProtectedContext,
  input: EditDiaryName,
): Promise<void> {
  const diaryService = new DiaryService(ctx);

  // Check if diary exists
  const diary = await diaryService.getDiaryById(input.diaryId);
  if (!diary) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Diary does not exist",
    });
  }

  // Edit the diary name
  await diaryService.editDiaryName(input.diaryId, input.name);
}
