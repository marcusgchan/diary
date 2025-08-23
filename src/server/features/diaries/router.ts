import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
import { DiaryOrchestrator } from "~/server/orchestrators/diary-orchestrator.service";
import { createDiarySchema, editDiaryNameSchema } from "./schema";

export const diariesRouter = createTRPCRouter({
  createDiary: protectedProcedure
    .input(createDiarySchema)
    .mutation(async ({ ctx, input }) => {
      const orchestrator = new DiaryOrchestrator(ctx);
      await orchestrator.createDiary(input.name);
    }),

  getDiaries: protectedProcedure.query(
    // Specify return type for optimistic updates since tempId is uuid and db id is a number
    async ({ ctx }): Promise<{ id: string | number; name: string }[]> => {
      const orchestrator = new DiaryOrchestrator(ctx);
      return await orchestrator.getDiaries();
    },
  ),

  getDiary: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const orchestrator = new DiaryOrchestrator(ctx);
      return (await orchestrator.getDiary(input.diaryId)) ?? null;
    }),

  editDiary: protectedProcedure
    .input(editDiaryNameSchema)
    .mutation(async ({ ctx, input }) => {
      const orchestrator = new DiaryOrchestrator(ctx);

      // Verify diary exists and user has access
      const hasAccess = await orchestrator.verifyDiaryAccess(input.diaryId);
      if (!hasAccess) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Diary does not exist",
        });
      }

      await orchestrator.editDiary(input.diaryId, input.name);
    }),

  deleteDiary: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const orchestrator = new DiaryOrchestrator(ctx);

      // Verify diary exists and user has access
      const hasAccess = await orchestrator.verifyDiaryAccess(input.diaryId);
      if (!hasAccess) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Diary does not exist",
        });
      }

      await orchestrator.deleteDiary(input.diaryId);
      return input.diaryId;
    }),
});
