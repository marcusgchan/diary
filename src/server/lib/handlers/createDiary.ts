import { type ProtectedContext } from "~/server/trpc";
import { DiaryService } from "../repositories/diary";
import { type CreateDiary } from "../schema";

export async function createDiaryHandler(
  ctx: ProtectedContext,
  input: CreateDiary,
): Promise<void> {
  const diary = new DiaryService(ctx);
  await diary.createDiary(input.name);
}
