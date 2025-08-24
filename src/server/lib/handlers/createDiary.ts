import { type ProtectedContext } from "~/server/trpc";
import { DiaryService } from "../repositories/diary";
import { createDiarySchema } from "../schema";

export async function createDiaryHandler(
  ctx: ProtectedContext,
  input: typeof createDiarySchema._type,
): Promise<void> {
  const diary = new DiaryService(ctx);
  await diary.createDiary(input.name);
}
