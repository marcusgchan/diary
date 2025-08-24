import { type ProtectedContext } from "~/server/trpc";
import { DiaryService } from "../repositories/diary";

export async function getDiaryHandler(
  ctx: ProtectedContext,
  input: { diaryId: number },
) {
  const diary = new DiaryService(ctx);
  return (await diary.getDiaryById(input.diaryId)) ?? null;
}
