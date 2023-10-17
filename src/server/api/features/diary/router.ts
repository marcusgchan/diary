import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { diaries, diariesToUsers } from "~/server/db/schema";

export const diaryRouter = createTRPCRouter({
  createDiary: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const diary = await tx.insert(diaries).values({ name: input.name });
        await tx.insert(diariesToUsers).values({
          userId: ctx.session.user.id,
          diaryId: Number(diary.insertId),
        });
      });
    }),
  getDiaries: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db
      .select({ diaryId: diaries.id, name: diaries.name })
      .from(diariesToUsers)
      .innerJoin(diaries, eq(diaries.id, diariesToUsers.diaryId))
      .where(eq(diariesToUsers.userId, ctx.session.user.id));
  }),
});
