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
  deleteDiaryById,
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
  updateDiaryStatusToDeleting,
  updateDiaryStatusToNotDeleting,
  updateDiaryEntryStatusToDeleting,
  updateDiaryEntryStatusToNotDeleting,
  getUnlinkedImages,
} from "./service";
import {
  createDiarySchema,
  createEntrySchema,
  createPostSchema,
  editDiaryNameSchema,
  editEntryDateSchema,
  saveEditorStateSchema,
  updateEntryTitleSchema,
} from "./schema";
import {
  deleteImage,
  deleteImages,
  getImageSignedUrl,
  getPresignedPost,
} from "../shared/s3ImagesService";
import { randomUUID } from "crypto";

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
      const keysToDelete = await getImageKeysByDiaryId({
        db: ctx.db,
        diaryId: input.diaryId,
      });

      await updateDiaryStatusToDeleting({
        diaryId: input.diaryId,
        db: ctx.db,
      });

      try {
        await deleteImages(keysToDelete);
        try {
          await deleteDiaryById({
            db: ctx.db,
            userId: ctx.session.user.id,
            diaryId: input.diaryId,
          });
        } catch (_) {
          // Deleted image but not metadata
          ctx.session.log(
            "delete_diary",
            "error",
            "failed to delete diary. image deleted from s3 but not deleted from database",
            {
              diaryId: input.diaryId,
              imageKeys: keysToDelete.map((k) => k.Key),
            },
          );
        }
      } catch (_) {
        ctx.session.log(
          "delete_diary",
          "warn",
          "failed to delete images from s3. reverting diary status to not deleting",
          {
            diaryId: input.diaryId,
          },
        );
        try {
          await updateDiaryStatusToNotDeleting({
            db: ctx.db,
            diaryId: input.diaryId,
          });
        } catch (_) {
          ctx.session.log(
            "delete_diary",
            "error",
            "failed to revert diary status to not deleting. diary status is deleting but image from s3 is not deleted",
            {
              diaryId: input.diaryId,
            },
          );
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
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

      await updateDiaryEntryStatusToDeleting({
        db: ctx.db,
        entryId: input.entryId,
      });

      try {
        await deleteImages(keysToDelete);
        try {
          await deleteEntry({ db: ctx.db, input });
        } catch (_) {
          ctx.session.log(
            "delete_entry",
            "error",
            "failed to delete entry. image deleted from s3 but not deleted from database",
            {
              diaryId: input.diaryId,
              entryId: input.entryId,
              imageKeys: keysToDelete.map((k) => k.Key),
            },
          );
        }
      } catch (_) {
        ctx.session.log(
          "delete_entry",
          "warn",
          "failed to delete images from s3. reverting entry status to not deleting",
          {
            diaryId: input.diaryId,
            entryId: input.entryId,
          },
        );
        try {
          await updateDiaryEntryStatusToNotDeleting({
            db: ctx.db,
            entryId: input.entryId,
          });
        } catch (_) {
          ctx.session.log(
            "delete_entry",
            "error",
            "failed to revert entry status to not deleting. entry status is deleting but image from s3 is not deleted",
            {
              diaryId: input.diaryId,
              entryId: input.entryId,
            },
          );
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      return input.entryId;
    }),
  createPost: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {}),
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
      }),
    )
    .query(async ({ ctx, input }) => {
      // for this user find all img with entryId null
      // filter out the ones that aren't interested with
      const unlinked = await getUnlinkedImages({
        db: ctx.db,
        keys: input.keys,
        diaryId: 1,
        entryId: 1,
        userId: ctx.session.user.id,
      });
      return { "1": "uploaded" };
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
