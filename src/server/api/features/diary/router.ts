import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { diaries, diariesToUsers, entries } from "~/server/db/schema";

export const diaryRouter = createTRPCRouter({
  createDiary: protectedProcedure
    .input(z.object({ id: z.string().or(z.number()), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(diaries)
          .values({ name: input.name });
        await tx.insert(diariesToUsers).values({
          userId: ctx.session.user.id,
          diaryId: inserted.insertId,
        });
      });
    }),
  getDiaries: protectedProcedure.query(
    // Specify return type for optimistic updates since tempId is uuid and db id is a number
    async ({ ctx }): Promise<{ id: string | number; name: string }[]> => {
      const diariesList = await ctx.db
        .select({ id: diaries.id, name: diaries.name })
        .from(diariesToUsers)
        .innerJoin(diaries, eq(diaries.id, diariesToUsers.diaryId))
        .where(eq(diariesToUsers.userId, ctx.session.user.id));
      return diariesList;
    },
  ),
  createEntry: protectedProcedure
    .input(z.object({ diaryId: z.number(), day: z.date() }))
    .mutation(async ({ ctx, input }) => {
      // Turn into transaction
      const res = await ctx.db
        .select()
        .from(entries)
        .innerJoin(
          diariesToUsers,
          and(
            eq(diariesToUsers.diaryId, entries.diaryId),
            eq(diariesToUsers.userId, ctx.session.user.id),
          ),
        )
        .where(eq(entries.diaryId, input.diaryId))
        .where(eq(entries.day, input.day));
      const [inserted] = await ctx.db
        .insert(entries)
        .values({ diaryId: input.diaryId });
    }),
});
