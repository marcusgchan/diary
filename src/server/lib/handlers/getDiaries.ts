import { type ProtectedContext } from "~/server/trpc";
import { DiaryService } from "../repositories/diary";

export async function getDiariesHandler(
  ctx: ProtectedContext,
): Promise<{ id: string | number; name: string }[]> {
  const diary = new DiaryService(ctx);
  return await diary.getDiaries();
}
