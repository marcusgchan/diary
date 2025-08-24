import { type ProtectedContext } from "~/server/trpc";
import { DiaryService } from "../repositories/diary";
import { type GetDiaryInput } from "../schema";

export async function getDiaryHandler(
  ctx: ProtectedContext,
  input: GetDiaryInput,
) {
  const diary = new DiaryService(ctx);
  return (await diary.getDiaryById(input.diaryId)) ?? null;
}
