import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
import { EntryDomainService } from "~/server/features/entries/service";
import { ImageDomainService } from "~/server/features/images/service";
import { getPresignedPost, getImageSignedUrl } from "../shared/s3ImagesService";
import { randomUUID } from "crypto";

export const imagesRouter = createTRPCRouter({
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
      const entryService = new EntryDomainService(ctx);
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
      const entryService = new EntryDomainService(ctx);
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
      const imageService = new ImageDomainService(ctx);

      if (lat !== undefined && lon !== undefined) {
        await imageService.insertImageMetadataWithGps({
          key: `${ctx.session.user.id}/${input.diaryId}/${input.entryId}/${uuid}-${input.imageMetadata.name.slice(0, indexOfDot)}`,
          lon,
          lat,
          dateTimeTaken: formattedDate,
        });
      } else {
        await imageService.insertImageMetadata({
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
      const imageService = new ImageDomainService(ctx);
      await imageService.insertImageMetadata({
        entryId: input.entryId,
        key: input.key,
      });
      return null;
    }),

  deleteImageMetadata: protectedProcedure
    .input(z.object({ key: z.string(), entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const entryService = new EntryDomainService(ctx);
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
      const entryService = new EntryDomainService(ctx);
      const entry = await entryService.getEntryIdById(input.entryId);

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const imageService = new ImageDomainService(ctx);
      const unlinked = await imageService.getUnlinkedImages({
        keys: input.keys,
        entryId: input.entryId,
      });

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
              return [
                id,
                { type: "compression_failure", key: el.key, url },
              ] as const;
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
        | { type: "compression_failure"; key: string; url: string }
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
      const imageService = new ImageDomainService(ctx);
      const status = await imageService.getImageUploadStatus(input.key);
      return status;
    }),

  cancelImageUpload: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Implementation would go here when needed
    }),

  confirmImageUpload: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Implementation would go here when needed
    }),
});
