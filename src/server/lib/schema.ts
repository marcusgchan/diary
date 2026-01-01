import { z } from "zod";

export const deleteEntrySchema = z.object({
  diaryId: z.number(),
  entryId: z.number(),
});
export type DeleteEntryInput = z.infer<typeof deleteEntrySchema>;

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

export const MAX_IMAGES_PER_POST = 7;

export const createPostSchema = z.object({
  entryId: z.number(),
  posts: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      images: z
        .object({
          type: z.string(),
          id: z.string(),
          key: z.string(),
          order: z.number().int(),
        })
        .array()
        .max(MAX_IMAGES_PER_POST),
    })
    .array(),
});
export type CreatePost = z.infer<typeof createPostSchema>;

const locationSchema = z.object({
  address: z.string(),
  longitude: z.number(),
  latitude: z.number(),
});

export const updatePostSchema = z.object({
  entryId: z.number(),
  posts: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      location: locationSchema.optional(),
      images: z
        .object({
          id: z.string(),
          key: z.string(),
          order: z.number().int(),
        })
        .array()
        .max(MAX_IMAGES_PER_POST),
    })
    .array(),
});
export type UpdatePost = z.infer<typeof updatePostSchema>;

export const getPostsSchema = z.object({
  entryId: z.number(),
});
export type GetPostsSchema = z.infer<typeof getPostsSchema>;

export const getDiaryInputSchema = z.object({
  diaryId: z.number(),
});
export type GetDiaryInput = z.infer<typeof getDiaryInputSchema>;

export const getEntriesInputSchema = z.object({
  diaryId: z.number(),
});
export type GetEntriesInput = z.infer<typeof getEntriesInputSchema>;

export const getEntryInputSchema = z.object({
  diaryId: z.number(),
  entryId: z.number(),
});
export type GetEntryInput = z.infer<typeof getEntryInputSchema>;

export const deleteDiaryInputSchema = z.object({
  diaryId: z.number(),
});
export type DeleteDiaryInput = z.infer<typeof deleteDiaryInputSchema>;

export const getEntryTitleInputSchema = z.object({
  entryId: z.number(),
});
export type GetEntryTitleInput = z.infer<typeof getEntryTitleInputSchema>;

export const getEntryDayInputSchema = z.object({
  entryId: z.number(),
});
export type GetEntryDayInput = z.infer<typeof getEntryDayInputSchema>;

export const deletePostByIdInputSchema = z.object({
  postId: z.string(),
  imageKey: z.string(),
});
export type DeletePostByIdInput = z.infer<typeof deletePostByIdInputSchema>;

export const saveImageMetadataInputSchema = z.object({
  key: z.string(),
  entryId: z.number(),
});
export type SaveImageMetadataInput = z.infer<
  typeof saveImageMetadataInputSchema
>;

export const deleteImageMetadataInputSchema = z.object({
  key: z.string(),
  entryId: z.number(),
});
export type DeleteImageMetadataInput = z.infer<
  typeof deleteImageMetadataInputSchema
>;

export const getImageUploadStatusInputSchema = z.object({
  key: z.string().optional(),
});
export type GetImageUploadStatusInput = z.infer<
  typeof getImageUploadStatusInputSchema
>;

export const cancelImageUploadInputSchema = z.object({
  key: z.string(),
});
export type CancelImageUploadInput = z.infer<
  typeof cancelImageUploadInputSchema
>;

export const confirmImageUploadInputSchema = z.object({
  key: z.string(),
});
export type ConfirmImageUploadInput = z.infer<
  typeof confirmImageUploadInputSchema
>;

export const getImageUrlInputSchema = z.string();
export type GetImageUrlInput = z.infer<typeof getImageUrlInputSchema>;

export const createPresignedPostUrlInputSchema = z.object({
  diaryId: z.number(),
  entryId: z.number(),
  imageMetadata: z.object({
    name: z.string(),
    mimetype: z.string(),
    size: z.number(),
  }),
});
export type CreatePresignedPostUrlInput = z.infer<
  typeof createPresignedPostUrlInputSchema
>;

export const getPresignedUrlInputSchema = z.object({
  diaryId: z.number(),
  entryId: z.number(),
  gps: z.object({
    lat: z.number().optional(),
    lon: z.number().optional(),
  }),
  dateTimeTaken: z.string().optional(),
  imageMetadata: z.object({
    name: z.string(),
    type: z.string(),
    size: z.number(),
  }),
});
export type GetPresignedUrlInput = z.infer<typeof getPresignedUrlInputSchema>;

export const getMultipleImageUploadStatusInputSchema = z.object({
  keys: z.string().array(),
  entryId: z.number(),
  diaryId: z.number(),
  keyToIdMap: z.map(z.string(), z.string()),
});
export type GetMultipleImageUploadStatusInput = z.infer<
  typeof getMultipleImageUploadStatusInputSchema
>;

export const getImagesByEntryIdSchema = z.object({ entryId: z.number() });
export type GetImagesByEntryId = z.infer<typeof getImagesByEntryIdSchema>;
