import { z } from "zod";

export const saveEditorStateSchema = z.object({
  diaryId: z.number(),
  entryId: z.number(),
  editorState: z.string(),
  updateDate: z.date(),
});
export type SaveEditorState = z.infer<typeof saveEditorStateSchema>;
