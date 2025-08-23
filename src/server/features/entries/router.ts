import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
import { EntryOrchestrator } from "~/server/orchestrators/entry-orchestrator.service";
import {
  createEntrySchema,
  editEntryDateSchema,
  updateEntryTitleSchema,
} from "./schema";
import { type Span } from "@opentelemetry/api";

export const entriesRouter = createTRPCRouter({
  getEntries: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const orchestrator = new EntryOrchestrator(ctx);
      return await orchestrator.getEntries(input.diaryId);
    }),

  getEntry: protectedProcedure
    .input(z.object({ diaryId: z.number(), entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const orchestrator = new EntryOrchestrator(ctx);
      return await orchestrator.getEntry(input.entryId);
    }),

  createEntry: protectedProcedure
    .input(createEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const orchestrator = new EntryOrchestrator(ctx);
      return await orchestrator.createEntry(input);
    }),

  deleteEntry: protectedProcedure
    .input(z.object({ diaryId: z.number(), entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.tracer.startActiveSpan(
        "deleteEntryProcedure",
        async (span: Span) => {
          const orchestrator = new EntryOrchestrator(ctx);

          // Verify entry exists and user has access
          const hasAccess = await orchestrator.verifyEntryAccess(input.entryId);
          if (!hasAccess) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Entry does not exist",
            });
          }

          await orchestrator.deleteEntry(input.entryId);
          span.end();
          return input.entryId;
        },
      );
    }),

  getEntryTitle: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const orchestrator = new EntryOrchestrator(ctx);
      const [title] = await orchestrator.getEntryTitle(input.entryId);

      if (title === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return title.title;
    }),

  getEntryDay: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const orchestrator = new EntryOrchestrator(ctx);
      const [day] = await orchestrator.getEntryDay(input.entryId);

      if (day === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return day.day;
    }),

  updateTitle: protectedProcedure
    .input(updateEntryTitleSchema)
    .mutation(async ({ ctx, input }) => {
      const orchestrator = new EntryOrchestrator(ctx);
      await orchestrator.updateTitle(input);
      return input.title;
    }),

  updateEntryDate: protectedProcedure
    .input(editEntryDateSchema)
    .mutation(async ({ ctx, input }) => {
      const orchestrator = new EntryOrchestrator(ctx);

      // Check if entry with this date already exists
      const existingEntry = await orchestrator.getEntryIdByDate(input);
      if (existingEntry) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Entry with this date already exists",
        });
      }

      await orchestrator.updateEntryDate(input);
      return { diaryId: input.diaryId, entryId: input.entryId, day: input.day };
    }),
});
