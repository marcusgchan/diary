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
} from "./service";
import {
  createDiarySchema,
  createEntrySchema,
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

      // TODO: properly handle errors with all settled
      await Promise.all([
        deleteImages(keysToDelete),
        deleteDiaryById({
          db: ctx.db,
          userId: ctx.session.user.id,
          diaryId: input.diaryId,
        }),
      ]);
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

      // TODO properly handle errors
      await Promise.all([
        deleteImages(keysToDelete),
        deleteEntry({ db: ctx.db, input }),
      ]);

      return input.entryId;
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
    .query(async ({ ctx, input }) => {
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

      if (lat !== undefined && lon !== undefined) {
        await insertImageMetadataWithGps({
          db: ctx.db,
          userId: ctx.session.user.id,
          entryId: input.entryId,
          key: `${ctx.session.user.id}/${input.diaryId}/${input.entryId}/${uuid}-${input.imageMetadata.name}`,
          lon,
          lat,
          dateTimeTaken: formattedDate,
        });
      } else {
        await insertImageMetadata({
          db: ctx.db,
          userId: ctx.session.user.id,
          entryId: input.entryId,
          key: `${ctx.session.user.id}/${input.diaryId}/${input.entryId}/${uuid}-${input.imageMetadata.name}`,
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
