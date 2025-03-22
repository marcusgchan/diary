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
  createPosts,
  getPosts,
  getEntryHeader,
  getPostsForForm,
  getEntryTitle,
  getEntryDay,
  getLinkedImageKeys,
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
  getImageSignedUrl,
  getPresignedPost,
  S3ImageService,
} from "../shared/s3ImagesService";
import { randomUUID } from "crypto";
import { typeSafeObjectFromEntries } from "~/app/_utils/typeSafeObjectFromEntries";
import { getCompressedImageKey } from "~/app/_utils/getCompressedImageKey";
import { Span } from "@opentelemetry/api";
import { tryCatch } from "~/app/_utils/tryCatch";

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
        const [err] = await tryCatch(s3ImageService.deleteImages(keysToDelete));
        if (err) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: err });
        }
      }

      const [err] = await tryCatch(diaryService.deleteDiary(input.diaryId));
      if (err) {
        ctx.log(
          "deleteDiary",
          "warn",
          "unable to delete entry from database: " + err,
        );
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

          let [err] = await tryCatch(s3ImageService.deleteImages(keysToDelete));
          if (err) {
            ctx.log(
              "deleteImages",
              "warn",
              "unable to delete entry from database: " + err,
            );
          }

          [err] = await tryCatch(deleteEntry({ db: ctx.db, input }));
          if (err) {
            ctx.log(
              "deleteEntry",
              "warn",
              "unable to delete entry from database: " + err,
            );
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
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      await createPosts({
        db: ctx.db,
        entryId: input.entryId,
        userId: ctx.session.user.id,
        posts: input.posts,
      });
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

      async function handleSignedUrl(
        key: string,
      ): Promise<{ success: true; url: string } | { success: false }> {
        try {
          const url = await getImageSignedUrl(key);
          return { success: true, url };
        } catch (e) {
          return { success: false };
        }
      }

      const postWithImage = await Promise.all(
        posts.map(async (post) => {
          const image = await handleSignedUrl(post.imageKey);
          const { imageKey: _, ...restOfPost } = post;
          return {
            ...restOfPost,
            image: image,
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

      async function handleSignedUrl(
        key: string,
      ): Promise<{ success: true; url: string } | { success: false }> {
        try {
          const url = await getImageSignedUrl(key);
          return { success: true, url };
        } catch (e) {
          return { success: false };
        }
      }

      const postWithImage = await Promise.all(
        posts.map(async (post) => {
          const image = await handleSignedUrl(post.imageKey);
          const {
            id,
            title,
            imageKey: key,
            description,
            name,
            size,
            mimetype,
          } = post;
          return {
            id,
            title,
            description,
            image: {
              key,
              name,
              size,
              mimetype,
              ...image,
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

      const keysToKeep = input.posts.map(({ key }) => key);

      const s3KeysToDelete = (
        await getImageKeysByEntryId({
          db: ctx.db,
          entryId: input.entryId,
        })
      ).filter((a) => !keysToKeep.includes(a.Key));
      const keysToDelete = (
        await getLinkedImageKeys({
          db: ctx.db,
          entryId: input.entryId,
        })
      )
        .map((k) => k.key)
        .filter((key) => !keysToKeep.includes(key));

      const diaryService = new DiaryServiceRepo(ctx);
      const s3ImageService = new S3ImageService(ctx);

      await diaryService.updatePostsToDeleting(input.entryId);

      let [err] = await tryCatch(s3ImageService.deleteImages(s3KeysToDelete));
      if (err) {
        //
      }

      [err] = await tryCatch(
        diaryService.deletePosts(input.entryId, keysToDelete),
      );
      if (err) {
        //
      }

      await createPosts({
        db: ctx.db,
        entryId: input.entryId,
        userId: ctx.session.user.id,
        posts: input.posts,
      });
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
  deleteUnlinkedImage: protectedProcedure
    .input(
      z.object({
        diaryId: z.number(),
        entryId: z.number(),
        key: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const s3ImageService = new S3ImageService(ctx);
      let [err] = await tryCatch(
        s3ImageService.deleteImages([
          { Key: input.key },
          { Key: getCompressedImageKey(input.key) },
        ]),
      );
      if (err) {
        throw err;
      }

      await deleteImageMetadata({ db: ctx.db, key: input.key });
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

      await Promise.all([
        deleteImage(input.key),
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
          } catch (e) {
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

      await Promise.all([
        deleteImage(input.key),
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
