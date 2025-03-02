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

export const createEntrySchema = z.object({
  diaryId: z.number(),
  day: z.string(),
});
export type CreateEntry = z.infer<typeof createEntrySchema>;

export const editDiaryNameSchema = z.object({
  diaryId: z.number(),
  name: z.string().min(1),
});
export type EditDiaryName = z.infer<typeof editDiaryNameSchema>;

export const createDiarySchema = z.object({
  id: z.string().or(z.number()),
  name: z.string().min(1),
});
export type CreateDiary = z.infer<typeof createDiarySchema>;

export const createPostSchema = z.object({
  entryId: z.number(),
  posts: z
    .object({
      title: z.string(),
      key: z.string(),
      description: z.string(),
    })
    .array(),
});
export type CreatePost = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  entryId: z.number(),
  posts: z
    .object({
      title: z.string(),
      key: z.string(),
      description: z.string(),
    })
    .array(),
});
export type UpdatePost = z.infer<typeof updatePostSchema>;

export const getPostsSchema = z.object({
  diaryId: z.number(),
  entryId: z.number(),
});
