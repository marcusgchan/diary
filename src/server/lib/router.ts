import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
import {
  createDiarySchema,
  createEntrySchema,
  createPostSchema,
  editDiaryNameSchema,
  editEntryDateSchema,
  getPostsSchema,
  saveEditorStateSchema,
  updateEntryTitleSchema,
  updatePostSchema,
  getDiaryInputSchema,
  getEntriesInputSchema,
  getEntryInputSchema,
  deleteEntrySchema,
  deleteDiaryInputSchema,
  getEntryTitleInputSchema,
  getEntryDayInputSchema,
  deletePostByIdInputSchema,
  saveImageMetadataInputSchema,
  deleteImageMetadataInputSchema,
  getImageUploadStatusInputSchema,
  cancelImageUploadInputSchema,
  confirmImageUploadInputSchema,
  getImageUrlInputSchema,
  createPresignedPostUrlInputSchema,
  getPresignedUrlInputSchema,
  getMultipleImageUploadStatusInputSchema,
  getImagesByEntryIdSchema,
} from "./schema";
import {
  createDiaryHandler,
  getDiariesHandler,
  getDiaryHandler,
  editDiaryHandler,
  deleteDiaryHandler,
} from "./handlers/diaryHandler";
import {
  createEntryHandler,
  getEntriesHandler,
  getEntryHandler,
  deleteEntryHandler,
  getEntryDayHandler,
  getEntryTitleHandler,
  updateEntryDateHandler,
  updateTitleHandler,
  saveEditorStateHandler,
} from "./handlers/entryHandler";
import {
  createPostsHandler,
  getPostsHandler,
  getPostsForFormHandler,
  updatePostsHandler,
  deletePostByIdHandler,
} from "./handlers/postHandler";
import {
  createPresignedPostUrlHandler,
  getPresignedUrlHandler,
  confirmImageUploadHandler,
  cancelImageUploadHandler,
  saveImageMetadataHandler,
  getImagesByEntryId,
  getImageUploadStatusHandler,
  getMultipleImageUploadStatusHandler,
  getImageUrlHandler,
  deleteImageMetadataHandler,
} from "./handlers/imageHandler";

export const diaryRouter = createTRPCRouter({
  createDiary: protectedProcedure
    .input(createDiarySchema)
    .mutation(async ({ ctx, input }) => {
      return await createDiaryHandler(ctx, input);
    }),
  getDiaries: protectedProcedure.query(
    // Specify return type for optimistic updates since tempId is uuid and db id is a number
    async ({ ctx }) => {
      return await getDiariesHandler(ctx);
    },
  ),
  getDiary: protectedProcedure
    .input(getDiaryInputSchema)
    .query(async ({ ctx, input }) => {
      return await getDiaryHandler(ctx, input);
    }),
  editDiary: protectedProcedure
    .input(editDiaryNameSchema)
    .mutation(async ({ ctx, input }) => {
      return await editDiaryHandler(ctx, input);
    }),
  deleteDiary: protectedProcedure
    .input(deleteDiaryInputSchema)
    .mutation(async ({ ctx, input }) => {
      return await deleteDiaryHandler(ctx, input);
    }),
  getEntries: protectedProcedure
    .input(getEntriesInputSchema)
    .query(async ({ ctx, input }) => {
      return await getEntriesHandler(ctx, input);
    }),
  getEntry: protectedProcedure
    .input(getEntryInputSchema)
    .query(async ({ ctx, input }) => {
      return await getEntryHandler(ctx, input);
    }),
  createEntry: protectedProcedure
    .input(createEntrySchema)
    .mutation(async ({ ctx, input }) => {
      return await createEntryHandler(ctx, input);
    }),
  deleteEntry: protectedProcedure
    .input(deleteEntrySchema)
    .mutation(async ({ ctx, input }) => {
      return await deleteEntryHandler(ctx, input);
    }),
  createPosts: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      return await createPostsHandler(ctx, input);
    }),
  deletePostById: protectedProcedure
    .input(deletePostByIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      return await deletePostByIdHandler(ctx, input);
    }),
  getPostsForForm: protectedProcedure
    .input(getPostsSchema)
    .query(async ({ ctx, input }) => {
      return await getPostsForFormHandler(ctx, input);
    }),
  getPosts: protectedProcedure
    .input(getPostsSchema)
    .query(async ({ ctx, input }) => {
      return await getPostsHandler(ctx, input);
    }),
  updatePosts: protectedProcedure
    .input(updatePostSchema)
    .mutation(async ({ ctx, input }) => {
      return await updatePostsHandler(ctx, input);
    }),
  getEntryTitle: protectedProcedure
    .input(getEntryTitleInputSchema)
    .query(async ({ ctx, input }) => {
      return await getEntryTitleHandler(ctx, input);
    }),
  getEntryDay: protectedProcedure
    .input(getEntryDayInputSchema)
    .query(async ({ ctx, input }) => {
      return await getEntryDayHandler(ctx, input);
    }),
  saveEditorState: protectedProcedure
    .input(saveEditorStateSchema)
    .mutation(async ({ ctx, input }) => {
      return await saveEditorStateHandler(ctx, input);
    }),
  updateTitle: protectedProcedure
    .input(updateEntryTitleSchema)
    .mutation(async ({ ctx, input }) => {
      return await updateTitleHandler(ctx, input);
    }),
  updateEntryDate: protectedProcedure
    .input(editEntryDateSchema)
    .mutation(async ({ ctx, input }) => {
      return await updateEntryDateHandler(ctx, input);
    }),
  createPresignedPostUrl: protectedProcedure
    .input(createPresignedPostUrlInputSchema)
    .query(async ({ ctx, input }) => {
      return await createPresignedPostUrlHandler(ctx, input);
    }),
  getPresignedUrl: protectedProcedure
    .input(getPresignedUrlInputSchema)
    .mutation(async ({ ctx, input }) => {
      return await getPresignedUrlHandler(ctx, input);
    }),
  saveImageMetadata: protectedProcedure
    .input(saveImageMetadataInputSchema)
    .mutation(async ({ ctx, input }) => {
      return await saveImageMetadataHandler(ctx, input);
    }),
  deleteImageMetadata: protectedProcedure
    .input(deleteImageMetadataInputSchema)
    .mutation(async ({ ctx, input }) => {
      return await deleteImageMetadataHandler(ctx, input);
    }),
  getImageUrl: protectedProcedure
    .input(getImageUrlInputSchema)
    .query(async ({ input }) => {
      return await getImageUrlHandler(input);
    }),
  getMultipleImageUploadStatus: protectedProcedure
    .input(getMultipleImageUploadStatusInputSchema)
    .query(async ({ ctx, input }) => {
      return await getMultipleImageUploadStatusHandler(ctx, input);
    }),
  getImageUploadStatus: protectedProcedure
    .input(getImageUploadStatusInputSchema)
    .query(async ({ ctx, input }) => {
      return await getImageUploadStatusHandler(ctx, input);
    }),
  cancelImageUpload: protectedProcedure
    .input(cancelImageUploadInputSchema)
    .mutation(async ({ ctx, input }) => {
      return await cancelImageUploadHandler(ctx, input);
    }),
  confirmImageUpload: protectedProcedure
    .input(confirmImageUploadInputSchema)
    .mutation(async ({ ctx, input }) => {
      return await confirmImageUploadHandler(ctx, input);
    }),

  // Map endpoints
  getImagesWithLocationByEntryId: protectedProcedure
    .input(getImagesByEntryIdSchema)
    .query(async ({ ctx, input }) => {
      return await getImagesByEntryId(ctx, input);
    }),
});
