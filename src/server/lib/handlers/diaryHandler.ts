import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { DiaryService } from "../repositories/diary";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import {
  type CreateDiary,
  type GetDiaryInput,
  type EditDiaryName,
  type DeleteDiaryInput,
} from "../schema";

export async function createDiaryHandler(
  ctx: ProtectedContext,
  input: CreateDiary,
): Promise<void> {
  const diary = new DiaryService(ctx);
  await diary.createDiary(input.name);
}

export async function getDiariesHandler(
  ctx: ProtectedContext,
): Promise<{ id: string | number; name: string }[]> {
  const diary = new DiaryService(ctx);
  return await diary.getDiaries();
}

export async function getDiaryHandler(
  ctx: ProtectedContext,
  input: GetDiaryInput,
) {
  const diary = new DiaryService(ctx);
  return (await diary.getDiaryById(input.diaryId)) ?? null;
}

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
