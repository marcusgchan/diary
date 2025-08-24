import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
import {
  insertImageMetadata,
  getImageUploadStatus,
  insertImageMetadataWithGps,
  getUnlinkedImages,
} from "./service";
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
} from "./schema";
import {
  expandKeys,
  getImageSignedUrl,
  getPresignedPost,
  S3ImageService,
} from "./integrations/s3Service";
import { randomUUID } from "crypto";
import { type Span } from "@opentelemetry/api";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { getUserIdFromKey } from "./utils";
import { DiaryService } from "./repositories/diary";
import { EntryService } from "./repositories/entry";
import { PostService } from "./repositories/post";
import { EditorStateService } from "./repositories/editorState";
import { getPostsForFormHandler } from "./handlers/getPostsForForm";
import { getPostsHandler } from "./handlers/getPosts";
import { deleteDiaryHandler } from "./handlers/deleteDiary";
import { editDiaryHandler } from "./handlers/editDiary";
import { deleteEntryHandler } from "./handlers/deleteEntry";
import { updatePostsHandler } from "./handlers/updatePosts";
import { getEntryTitleHandler } from "./handlers/getEntryTitle";
import { getEntryDayHandler } from "./handlers/getEntryDay";
import { updateEntryDateHandler } from "./handlers/updateEntryDate";
import { saveEditorStateHandler } from "./handlers/saveEditorState";
import { updateTitleHandler } from "./handlers/updateTitle";
import { createPresignedPostUrlHandler } from "./handlers/createPresignedPostUrl";
import { getPresignedUrlHandler } from "./handlers/getPresignedUrl";
import { saveImageMetadataHandler } from "./handlers/saveImageMetadata";
import { deleteImageMetadataHandler } from "./handlers/deleteImageMetadata";
import { getMultipleImageUploadStatusHandler } from "./handlers/getMultipleImageUploadStatus";
import { getImageUploadStatusHandler } from "./handlers/getImageUploadStatus";
import { cancelImageUploadHandler } from "./handlers/cancelImageUpload";
import { confirmImageUploadHandler } from "./handlers/confirmImageUpload";

export const diaryRouter = createTRPCRouter({
  createDiary: protectedProcedure
    .input(createDiarySchema)
    .mutation(async ({ ctx, input }) => {
      const diary = new DiaryService(ctx);
      await diary.createDiary(input.name);
    }),
  getDiaries: protectedProcedure.query(
    // Specify return type for optimistic updates since tempId is uuid and db id is a number
    async ({ ctx }): Promise<{ id: string | number; name: string }[]> => {
      const diary = new DiaryService(ctx);
      return await diary.getDiaries();
    },
  ),
  getDiary: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const diary = new DiaryService(ctx);
      return (await diary.getDiaryById(input.diaryId)) ?? null;
    }),
  editDiary: protectedProcedure
    .input(editDiaryNameSchema)
    .mutation(async ({ ctx, input }) => {
      return await editDiaryHandler(ctx, input);
    }),
  deleteDiary: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await deleteDiaryHandler(ctx, input);
    }),
  getEntries: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const entryService = new EntryService(ctx);
      return await entryService.getEntries(input.diaryId);
    }),
  getEntry: protectedProcedure
    .input(z.object({ diaryId: z.number(), entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const entryService = new EntryService(ctx);
      return await entryService.getEntry(input.entryId);
    }),
  createEntry: protectedProcedure
    .input(createEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const entryService = new EntryService(ctx);
      return await entryService.createEntry(input);
    }),
  deleteEntry: protectedProcedure
    .input(z.object({ diaryId: z.number(), entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await deleteEntryHandler(ctx, input);
    }),
  createPosts: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const entryService = new EntryService(ctx);
      const entry = await entryService.getEntryIdById(input.entryId);
      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const postService = new PostService(ctx);
      await postService.createPosts(input.entryId, input.posts);
      return await postService.getPosts(input.entryId);
    }),
  deletePostById: protectedProcedure
    .input(z.object({ postId: z.string(), imageKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const postService = new PostService(ctx);
      const postId = await postService.getPostById(input.postId);
      if (postId === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // verify image key
      const userId = getUserIdFromKey(input.imageKey);
      if (userId === null || userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await postService.flagPostForDeletion(input.postId);

      const s3Service = new S3ImageService(ctx);

      const [err] = await tryCatch(
        s3Service.deleteImages(expandKeys([input.imageKey])),
      );
      if (!err) {
        await postService.deletePostById(input.postId);
      }
    }),
  getPostsForForm: protectedProcedure
    .input(getPostsSchema)
    .query(async ({ ctx, input }) => {
      return await getPostsForFormHandler(ctx, input);
    }),
  getPosts: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getPostsHandler(ctx, input);
    }),
  updatePosts: protectedProcedure
    .input(updatePostSchema)
    .mutation(async ({ ctx, input }) => {
      return await updatePostsHandler(ctx, input);
    }),
  getEntryTitle: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getEntryTitleHandler(ctx, input);
    }),
  getEntryDay: protectedProcedure
    .input(z.object({ entryId: z.number() }))
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
    .input(
      z.object({
        diaryId: z.number(),
        entryId: z.number(),
        imageMetadata: z.object({
          name: z.string(),
          mimetype: z.string(),
          size: z.number(),
        }),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await createPresignedPostUrlHandler(ctx, input);
    }),
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await getPresignedUrlHandler(ctx, input);
    }),
  saveImageMetadata: protectedProcedure
    .input(z.object({ key: z.string(), entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await saveImageMetadataHandler(ctx, input);
    }),
  deleteImageMetadata: protectedProcedure
    .input(z.object({ key: z.string(), entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await deleteImageMetadataHandler(ctx, input);
    }),
  getImageUrl: protectedProcedure.input(z.string()).query(async ({ input }) => {
    return await getImageSignedUrl(input);
  }),
  getMultipleImageUploadStatus: protectedProcedure
    .input(
      z.object({
        keys: z.string().array(),
        entryId: z.number(),
        diaryId: z.number(),
        keyToIdMap: z.map(z.string(), z.string()),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await getMultipleImageUploadStatusHandler(ctx, input);
    }),
  getImageUploadStatus: protectedProcedure
    .input(z.object({ key: z.string().or(z.undefined()) }))
    .query(async ({ ctx, input }) => {
      return await getImageUploadStatusHandler(ctx, input);
    }),
  cancelImageUpload: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await cancelImageUploadHandler(ctx, input);
    }),
  confirmImageUpload: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await confirmImageUploadHandler(ctx, input);
    }),
});
