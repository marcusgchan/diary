import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  createEntry,
  deleteEntry,
  updateEntryDate,
  getEntries,
  getEntry,
  saveEditorState,
  updateTitle,
  getEntryIdsByDate as getEntryIdByDate,
  getDiaryById,
  getDiaryIdById,
  editDiaryName,
  getDiaries,
  createDiary,
  getEntryIdById,
  insertImageMetadata,
  deleteImageMetadata,
  getImageUploadStatus,
  cancelImageUpload,
  getKeyByKey,
  confirmImageUpload,
  getImageKeysByDiaryId,
  getImageKeysByEntryId,
  insertImageMetadataWithGps,
  getEntryIdByEntryAndDiaryId,
  getUnlinkedImages,
  getPosts,
  getEntryHeader,
  getPostsForForm,
  getEntryTitle,
  getEntryDay,
  DiaryServiceRepo,
} from "./service";
import {
  createDiarySchema,
  createEntrySchema,
  createPostSchema,
  editDiaryNameSchema,
  editEntryDateSchema,
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
import { typeSafeObjectFromEntries } from "~/app/_utils/typeSafeObjectFromEntries";
import { Span } from "@opentelemetry/api";
import { tryCatch } from "~/app/_utils/tryCatch";
import { getUserIdFromKey } from "./utils";

export const diaryRouter = createTRPCRouter({
  createDiary: protectedProcedure
    .input(createDiarySchema)
    .mutation(async ({ ctx, input }) => {
      await createDiary({
        db: ctx.db,
        userId: ctx.session.user.id,
        name: input.name,
      });
    }),
  getDiaries: protectedProcedure.query(
    // Specify return type for optimistic updates since tempId is uuid and db id is a number
    async ({ ctx }): Promise<{ id: string | number; name: string }[]> => {
      return await getDiaries({ db: ctx.db, userId: ctx.session.user.id });
    },
  ),
  getDiary: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const diary = await getDiaryById({
        db: ctx.db,
        userId: ctx.session.user.id,
        diaryId: input.diaryId,
      });
      return diary ?? null;
    }),
  editDiary: protectedProcedure
    .input(editDiaryNameSchema)
    .mutation(async ({ ctx, input }) => {
      const diary = await getDiaryIdById({
        diaryId: input.diaryId,
        userId: ctx.session.user.id,
        db: ctx.db,
      });
      if (!diary) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Diary does not exist",
        });
      }
      await editDiaryName({
        db: ctx.db,
        input: { diaryId: input.diaryId, name: input.name },
      });
    }),
  deleteDiary: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const diaryId = await getDiaryIdById({
        db: ctx.db,
        userId: ctx.session.user.id,
        diaryId: input.diaryId,
      });
      if (!diaryId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Diary does not exist",
        });
      }

      const diaryService = new DiaryServiceRepo(ctx);
      const s3ImageService = new S3ImageService(ctx);

      await diaryService.flagDiaryForDeletion(input.diaryId);

      const keysToDelete = await getImageKeysByDiaryId({
        db: ctx.db,
        diaryId: input.diaryId,
      });

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
      return await getEntries({
        db: ctx.db,
        userId: ctx.session.user.id,
        diaryId: input.diaryId,
      });
    }),
  getEntry: protectedProcedure
    .input(z.object({ diaryId: z.number(), entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const entry = await getEntry({
        db: ctx.db,
        userId: ctx.session.user.id,
        entryId: input.entryId,
      });
      return entry ?? null;
    }),
  createEntry: protectedProcedure
    .input(createEntrySchema)
    .mutation(async ({ ctx, input }) => {
      return await createEntry({
        db: ctx.db,
        userId: ctx.session.user.id,
        input,
      });
    }),
  deleteEntry: protectedProcedure
    .input(z.object({ diaryId: z.number(), entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.tracer.startActiveSpan(
        "deleteEntryProcedure",
        async (span: Span) => {
          const entry = await getEntryIdById({
            db: ctx.db,
            userId: ctx.session.user.id,
            entryId: input.entryId,
          });
          if (!entry) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Entry does not exist",
            });
          }
          const keysToDelete = await getImageKeysByEntryId({
            db: ctx.db,
            entryId: input.entryId,
          });

          const diaryService = new DiaryServiceRepo(ctx);
          const s3ImageService = new S3ImageService(ctx);

          await diaryService.flagEntryForDeletion(input.entryId);

          let [err] = await tryCatch(
            s3ImageService.deleteImages(expandKeys(keysToDelete)),
          );

          // Only delete entries if image deletion is successful
          // The cron job will retry deletion so we still need key info if s3
          // req fails
          if (!err) {
            [err] = await tryCatch(deleteEntry({ db: ctx.db, input }));
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
      const entry = await getEntryIdById({
        db: ctx.db,
        userId: ctx.session.user.id,
        entryId: input.entryId,
      });
      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const diaryService = new DiaryServiceRepo(ctx);
      await diaryService.upsertPosts(input.entryId, input.posts);
    }),
  deletePostById: protectedProcedure
    .input(z.object({ postId: z.string(), imageKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const diaryService = new DiaryServiceRepo(ctx);
      const postId = await diaryService.getPostById(input.postId);
      if (postId === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // verify image key
      const userId = getUserIdFromKey(input.imageKey);
      if (userId === null || userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await diaryService.flagPostForDeletion(input.postId);

      const s3Service = new S3ImageService(ctx);

      const [err] = await tryCatch(
        s3Service.deleteImages(expandKeys([input.imageKey])),
      );
      if (!err) {
        await diaryService.deletePostById(input.postId);
      }
    }),
  getEntryMap: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [header] = await getEntryHeader({
        db: ctx.db,
        userId: ctx.session.user.id,
        entryId: input.entryId,
      });

      if (!header) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const posts = await getPosts({
        db: ctx.db,
        userId: ctx.session.user.id,
        entryId: input.entryId,
      });

      const postWithImage = await Promise.all(
        posts.map(async (post) => {
          const { imageKey: _, ...restOfPost } = post;

          if (!post.imageKey) {
            return {
              ...restOfPost,
              image: {
                type: "EMPTY" as const,
              },
            };
          }

          const [err, data] = await tryCatch(getImageSignedUrl(post.imageKey));
          if (err) {
            return {
              ...restOfPost,
              image: {
                type: "FAILED" as const,
              },
            };
          }

          return {
            ...restOfPost,
            image: {
              type: "SUCCESS" as const,
              url: data,
            },
          };
        }),
      );

      return {
        header,
        posts: postWithImage,
      };
    }),
  getPostsForForm: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [header] = await getEntryHeader({
        db: ctx.db,
        userId: ctx.session.user.id,
        entryId: input.entryId,
      });

      if (!header) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const posts = await getPostsForForm({
        db: ctx.db,
        userId: ctx.session.user.id,
        entryId: input.entryId,
      });
      console.log({ posts });
      const postWithImage = await Promise.all(
        posts.map(async (post) => {
          const { imageKey: key, name, size, mimetype, ...otherFields } = post;

          // Invariant: they're either all null or non null
          // but I'll write this way to make the types nicer
          if (
            key === null ||
            name === null ||
            size === null ||
            mimetype === null
          ) {
            return {
              ...otherFields,
              image: {
                type: "EMPTY" as const,
              },
            };
          }

          const [err, url] = await tryCatch(getImageSignedUrl(key));
          if (err) {
            return {
              ...otherFields,
              image: {
                type: "FAILED" as const,
                key,
                name,
                size,
                mimetype,
              },
            };
          }

          return {
            ...otherFields,
            image: {
              type: "SUCCESS" as const,
              key,
              name,
              size,
              mimetype,
              url,
            },
          };
        }),
      );

      return postWithImage;
    }),
  updatePosts: protectedProcedure
    .input(updatePostSchema)
    .mutation(async ({ ctx, input }) => {
      const entryId = getEntryIdById({
        entryId: input.entryId,
        userId: ctx.session.user.id,
        db: ctx.db,
      });
      if (entryId === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const diaryService = new DiaryServiceRepo(ctx);
      const posts = await diaryService.getPosts(input.entryId);

      // Find posts that need to be deleted (posts that exist in the database but not in the input)
      const postsToDelete = posts.filter(
        (post) => !input.posts.some(({ id }) => id === post.id),
      );

      if (postsToDelete.length > 0) {
        const postIdsToDelete = postsToDelete.map((p) => p.id);
        const imageKeysToDelete = postsToDelete
          .filter((p) => p.imageKey !== null)
          .map((p) => p.imageKey!);

        // First flag the posts for deletion
        await diaryService.flagPostsToDeleteByIds(postIdsToDelete);

        // Delete the images from S3
        const s3Service = new S3ImageService(ctx);
        const [err] = await tryCatch(
          s3Service.deleteImages(expandKeys(imageKeysToDelete)),
        );

        // Only delete posts from database if S3 deletion was successful
        if (!err) {
          await diaryService.deletePostsByIds(postIdsToDelete);
        }
      }

      // Create/update the remaining posts
      await diaryService.upsertPosts(input.entryId, input.posts);
    }),
  getEntryTitle: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [title] = await getEntryTitle({
        db: ctx.db,
        userId: ctx.session.user.id,
        entryId: input.entryId,
      });

      if (title === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return title.title;
    }),
  getEntryDay: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [day] = await getEntryDay({
        db: ctx.db,
        userId: ctx.session.user.id,
        entryId: input.entryId,
      });

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
      console.log(err);
      const diaryService = new DiaryServiceRepo(ctx);
      if (!err) {
        await tryCatch(diaryService.deleteFileByKey(input.key));
      }
    }),

  saveEditorState: protectedProcedure
    .input(saveEditorStateSchema)
    .mutation(async ({ ctx, input }) => {
      await saveEditorState({ db: ctx.db, userId: ctx.session.user.id, input });
      return await getEntry({
        db: ctx.db,
        userId: ctx.session.user.id,
        entryId: input.entryId,
      });
    }),
  updateTitle: protectedProcedure
    .input(updateEntryTitleSchema)
    .mutation(async ({ ctx, input }) => {
      await updateTitle({ db: ctx.db, userId: ctx.session.user.id, input });
      return input.title;
    }),
  updateEntryDate: protectedProcedure
    .input(editEntryDateSchema)
    .mutation(async ({ ctx, input }) => {
      const id = await getEntryIdByDate({
        db: ctx.db,
        userId: ctx.session.user.id,
        input,
      });
      if (id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Entry with this date already exists",
        });
      }
      await updateEntryDate({
        db: ctx.db,
        userId: ctx.session.user.id,
        input,
      });
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
      const entry = await getEntryIdByEntryAndDiaryId({
        db: ctx.db,
        entryId: input.entryId,
        diaryId: input.diaryId,
        userId: ctx.session.user.id,
      });
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
      const entry = await getEntryIdByEntryAndDiaryId({
        db: ctx.db,
        entryId: input.entryId,
        diaryId: input.diaryId,
        userId: ctx.session.user.id,
      });
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
      const [key] = await getKeyByKey({
        db: ctx.db,
        userId: ctx.session.user.id,
        key: input.key,
      });
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

      return await getEntry({
        db: ctx.db,
        entryId: input.entryId,
        userId: ctx.session.user.id,
      });
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

      const entry = await getEntryIdById({
        db: ctx.db,
        entryId: input.entryId,
        userId: ctx.session.user.id,
      });

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
              return [id, { key: el.key, url, status: "failure" }] as const;
            }

            return [id, { key: el.key, url, status: "success" }] as const;
          } catch (_) {
            return [
              input.keyToIdMap.get(el.key)!,
              {
                status: "failure",
              },
            ] as const;
          }
        });
      const res = await Promise.all(unlinkedTransformed);
      return typeSafeObjectFromEntries(res);
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
      const [key] = await getKeyByKey({
        db: ctx.db,
        userId: ctx.session.user.id,
        key: input.key,
      });
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
      const [key] = await getKeyByKey({
        db: ctx.db,
        userId: ctx.session.user.id,
        key: input.key,
      });
      if (!key) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await confirmImageUpload({ db: ctx.db, key: input.key });
    }),
});
