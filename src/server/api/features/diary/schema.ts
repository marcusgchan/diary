import { z } from "zod";

export const deleteEntrySchema = z.object({
  diaryId: z.number(),
  entryId: z.number(),
});
export type DeleteEntryInput = z.infer<typeof deleteEntrySchema>;
export type GetEntryInput = DeleteEntryInput;

export const updateEntryTitleSchema = z.object({
  diaryId: z.number(),
  entryId: z.number(),
  title: z.string(),
});
export type UpdateEntryTitle = z.infer<typeof updateEntryTitleSchema>;
