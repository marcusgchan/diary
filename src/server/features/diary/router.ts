import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
import {
  insertImageMetadata,
  deleteImageMetadata,
  getImageUploadStatus,
  cancelImageUpload,
  confirmImageUpload,
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
} from "../shared/s3ImagesService";
import { randomUUID } from "crypto";
import { type Span } from "@opentelemetry/api";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { getUserIdFromKey } from "./utils";
import { DiaryService } from "./services/diary";
import { EntryService } from "./services/entry";
import { ImageService } from "./services/image";
import { PostService } from "./services/post";
import { EditorStateService } from "./services/editorState";
import { getPostsForFormController } from "./controllers/getPostsForForm";
import { getPostsController } from "./controllers/getPosts";

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
      const diaryService = new DiaryService(ctx);
      const diary = await diaryService.getDiaryById(input.diaryId);
      if (!diary) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Diary does not exist",
        });
      }
      await diaryService.editDiaryName(input.diaryId, input.name);
    }),
  deleteDiary: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const diaryService = new DiaryService(ctx);
      const diaryId = await diaryService.getDiaryIdById(input.diaryId);
      if (!diaryId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Diary does not exist",
        });
      }

      const s3ImageService = new S3ImageService(ctx);

      await diaryService.flagDiaryForDeletion(input.diaryId);

      const imageService = new ImageService(ctx);
      const keysToDelete = await imageService.getImageKeysByDiaryId(
        input.diaryId,
      );

      if (keysToDelete.length > 0) {
        let [err] = await tryCatch(s3ImageService.deleteImages(keysToDelete));
        if (err) {
          return input.diaryId;
        }

        [err] = await tryCatch(diaryService.deleteDiary(input.diaryId));
        if (err) {
          ctx.log(
            "deleteDiary",
            "warn",
            "unable to delete entry from database: " + err.message,
          );
        }
      } else {
        const [err] = await tryCatch(diaryService.deleteDiary(input.diaryId));
        if (err) {
          ctx.log(
            "deleteDiary",
            "warn",
            "unable to delete entry from database: " + err.message,
          );
        }
      }

      return input.diaryId;
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
      return ctx.tracer.startActiveSpan(
        "deleteEntryProcedure",
        async (span: Span) => {
          const entryService = new EntryService(ctx);
          const entry = await entryService.getEntryIdById(input.entryId);
          if (!entry) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Entry does not exist",
            });
          }

          const imageService = new ImageService(ctx);
          const keysToDelete = await imageService.getImageKeysByEntryId(
            input.entryId,
          );

          const s3ImageService = new S3ImageService(ctx);
          await entryService.flagEntryForDeletion(input.entryId);

          let [err] = await tryCatch(
            s3ImageService.deleteImages(expandKeys(keysToDelete)),
          );

          // Only delete entries if image deletion is successful
          // The cron job will retry deletion so we still need key info if s3
          // req fails
          if (!err) {
            [err] = await tryCatch(entryService.deleteEntry(input.entryId));
            if (err) {
              ctx.log(
                "deleteEntry",
                "warn",
                "unable to delete entry from database: " + err.message,
              );
            }
          }

          span.end();
          return input.entryId;
        },
      );
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
      await postService.upsertPosts(input.entryId, input.posts);
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
      return await getPostsForFormController(ctx, input);
    }),
  getPosts: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getPostsController(ctx, input);
    }),
  updatePosts: protectedProcedure
    .input(updatePostSchema)
    .mutation(async ({ ctx, input }) => {
      const entryService = new EntryService(ctx);
      const entryId = await entryService.getEntryIdById(input.entryId);

      if (entryId === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const postService = new PostService(ctx);
      const posts = await postService.getPostsForForm(input.entryId);

      // Find posts that need to be deleted (posts that exist in the database but not in the input)
      const postsToDelete = posts.filter(
        (post) => !input.posts.some(({ id }) => id === post.id),
      );

      if (postsToDelete.length > 0) {
        const postIdsToDelete = postsToDelete.map((p) => p.id);
        const imageKeysToDelete = postsToDelete
          .filter((p) => p.image.key !== null)
          .map((p) => p.image.key);

        // First flag the posts for deletion
        await postService.flagPostsToDeleteByIds(postIdsToDelete);

        // Delete the images from S3
        const s3Service = new S3ImageService(ctx);
        const [err] = await tryCatch(
          s3Service.deleteImages(expandKeys(imageKeysToDelete)),
        );

        // Only delete posts from database if S3 deletion was successful
        if (!err) {
          await postService.deletePostsByIds(postIdsToDelete);
        }
      }

      // Create/update the remaining posts
      await postService.upsertPosts(input.entryId, input.posts);
    }),
  getEntryTitle: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const entryService = new EntryService(ctx);
      const [title] = await entryService.getEntryTitle(input.entryId);

      if (title === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return title.title;
    }),
  getEntryDay: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const entryService = new EntryService(ctx);
      const [day] = await entryService.getEntryDay(input.entryId);

      if (day === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return day.day;
    }),
  deleteImage: protectedProcedure
    .input(
      z.object({
        key: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getUserIdFromKey(input.key);
      if (userId === null || userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const s3ImageService = new S3ImageService(ctx);
      const [err] = await tryCatch(
        s3ImageService.deleteImages(expandKeys([input.key])),
      );

      const imageService = new ImageService(ctx);
      if (!err) {
        await tryCatch(imageService.deleteFileByKey(input.key));
      }
    }),

  saveEditorState: protectedProcedure
    .input(saveEditorStateSchema)
    .mutation(async ({ ctx, input }) => {
      const editorStateService = new EditorStateService(ctx);
      await editorStateService.saveEditorState(input);

      const entryService = new EntryService(ctx);
      return await entryService.getEntry(input.entryId);
    }),
  updateTitle: protectedProcedure
    .input(updateEntryTitleSchema)
    .mutation(async ({ ctx, input }) => {
      const entryService = new EntryService(ctx);
      await entryService.updateTitle(input);
      return input.title;
    }),
  updateEntryDate: protectedProcedure
    .input(editEntryDateSchema)
    .mutation(async ({ ctx, input }) => {
      const entryService = new EntryService(ctx);
      const id = await entryService.getEntryIdByDate(input);
      if (id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Entry with this date already exists",
        });
      }
      await entryService.updateEntryDate(input);
      return { diaryId: input.diaryId, entryId: input.entryId, day: input.day };
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
      const entryService = new EntryService(ctx);
      const entry = await entryService.getEntryIdById(input.entryId);
      if (!entry) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Entry does not exist",
        });
      }
      const uuid = randomUUID();
      const url = await getPresignedPost(
        ctx.session.user.id,
        input.diaryId,
        input.entryId,
        uuid,
        {
          name: input.imageMetadata.name,
          size: input.imageMetadata.size,
          type: input.imageMetadata.mimetype,
        },
      );
      return url;
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
      const uuid = randomUUID();
      const entryService = new EntryService(ctx);
      const entry = await entryService.getEntryIdById(input.entryId);
      if (!entry) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Entry with this date already exists",
        });
      }

      const lat = input.gps.lat;
      const lon = input.gps.lon;
      const dateTimeTaken = input.dateTimeTaken;
      let formattedDate = undefined;

      const segments = dateTimeTaken?.split(" ");
      if (segments) {
        const date = segments[0]?.replaceAll(":", "/");
        const time = segments[1];
        if (date !== undefined && time !== undefined) {
          formattedDate = `${date} ${time}`;
        }
      }

      const indexOfDot = input.imageMetadata.name.lastIndexOf(".");

      if (lat !== undefined && lon !== undefined) {
        await insertImageMetadataWithGps({
          db: ctx.db,
          userId: ctx.session.user.id,
          entryId: input.entryId,
          key: `${ctx.session.user.id}/${input.diaryId}/${input.entryId}/${uuid}-${input.imageMetadata.name.slice(0, indexOfDot)}`,
          lon,
          lat,
          dateTimeTaken: formattedDate,
        });
      } else {
        await insertImageMetadata({
          db: ctx.db,
          userId: ctx.session.user.id,
          entryId: input.entryId,
          key: `${ctx.session.user.id}/${input.diaryId}/${input.entryId}/${uuid}-${input.imageMetadata.name.slice(0, indexOfDot)}`,
          dateTimeTaken: formattedDate,
        });
      }

      const url = await getPresignedPost(
        ctx.session.user.id,
        input.diaryId,
        input.entryId,
        uuid,
        input.imageMetadata,
      );
      return url;
    }),
  saveImageMetadata: protectedProcedure
    .input(z.object({ key: z.string(), entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await insertImageMetadata({
        db: ctx.db,
        userId: ctx.session.user.id,
        entryId: input.entryId,
        key: input.key,
      });
      return null;
    }),
  deleteImageMetadata: protectedProcedure
    .input(z.object({ key: z.string(), entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const imageService = new ImageService(ctx);
      const [key] = await imageService.getKeyByKey(input.key);
      if (!key) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const s3Service = new S3ImageService(ctx);
      await Promise.all([
        s3Service.deleteImage(input.key),
        deleteImageMetadata({
          db: ctx.db,
          key: input.key,
        }),
      ]);

      const entryService = new EntryService(ctx);
      return await entryService.getEntry(input.entryId);
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
      // for this user find all img with entryId null
      // filter out the ones that aren't interested with
      const entryService = new EntryService(ctx);
      const entry = await entryService.getEntryIdById(input.entryId);

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      console.log({
        keys: input.keys,
        diaryId: input.diaryId,
        entryId: input.entryId,
      });

      const unlinked = await getUnlinkedImages({
        db: ctx.db,
        keys: input.keys,
        entryId: input.entryId,
      });
      console.log({ unlinked });

      const unlinkedTransformed = unlinked
        .filter((el) => input.keyToIdMap.get(el.key) !== undefined)
        .map(async (el) => {
          try {
            const url = await getImageSignedUrl(el.key);
            const id = input.keyToIdMap.get(el.key);
            if (id === undefined) {
              throw new Error();
            }

            if (el.compressionStatus === "failure") {
              return [id, { type: "failure", key: el.key, url }] as const;
            }

            return [id, { type: "success", key: el.key, url }] as const;
          } catch (_) {
            return [
              input.keyToIdMap.get(el.key)!,
              {
                type: "error",
              },
            ] as const;
          }
        });
      const res = await Promise.all(unlinkedTransformed);
      const resultMap = new Map<
        string,
        | { type: "success"; key: string; url: string }
        | { type: "failure"; key: string; url: string }
        | { type: "error" }
      >();
      for (const [key, value] of res) {
        resultMap.set(key, value);
      }
      return resultMap;
    }),
  getImageUploadStatus: protectedProcedure
    .input(z.object({ key: z.string().or(z.undefined()) }))
    .query(async ({ ctx, input }) => {
      if (!input.key) {
        return false;
      }
      const status = await getImageUploadStatus({ db: ctx.db, key: input.key });
      return status;
    }),
  cancelImageUpload: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const imageService = new ImageService(ctx);
      const [key] = await imageService.getKeyByKey(input.key);
      if (!key) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const s3Service = new S3ImageService(ctx);
      await Promise.all([
        s3Service.deleteImage(input.key),
        cancelImageUpload({
          db: ctx.db,
          key: input.key,
        }),
      ]);
    }),
  confirmImageUpload: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const imageService = new ImageService(ctx);
      const [key] = await imageService.getKeyByKey(input.key);
      if (!key) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      confirmImageUpload({ db: ctx.db, key: input.key });
    }),
});
