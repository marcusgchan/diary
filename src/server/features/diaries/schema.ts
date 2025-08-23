import { z } from "zod";

export const createDiarySchema = z.object({
  id: z.string().or(z.number()),
  name: z.string().min(1),
});
export type CreateDiary = z.infer<typeof createDiarySchema>;

export const editDiaryNameSchema = z.object({
  diaryId: z.number(),
  name: z.string().min(1),
});
export type EditDiaryName = z.infer<typeof editDiaryNameSchema>;
