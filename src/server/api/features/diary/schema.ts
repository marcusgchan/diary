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

export const editEntryDateSchema = z.object({
  diaryId: z.number(),
  entryId: z.number(),
  day: z.string(),
});
export type EditEntryDate = z.infer<typeof editEntryDateSchema>;

export const saveEditorStateSchema = z.object({
  diaryId: z.number(),
  entryId: z.number(),
  editorState: z.string(),
  updateDate: z.date(),
});
export type SaveEditorState = z.infer<typeof saveEditorStateSchema>;
