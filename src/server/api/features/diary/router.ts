import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
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
  getEntries: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const entriesList = await ctx.db
        .select({
          id: entries.id,
          day: entries.day,
          title: entries.title,
          diaryId: entries.diaryId,
        })
        .from(entries)
        .orderBy(desc(entries.updatedAt))
        .where(eq(entries.diaryId, input.diaryId))
        .innerJoin(diaries, eq(diaries.id, entries.diaryId))
        .innerJoin(diariesToUsers, eq(diaries.id, diariesToUsers.diaryId))
        .where(eq(diariesToUsers.userId, ctx.session.user.id));
      return entriesList;
    }),
  getEntry: protectedProcedure
    .input(z.object({ diaryId: z.number(), entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .selectDistinct({
          id: entries.id,
          day: entries.day,
          title: entries.title,
        })
        .from(entries)
        .where(
          and(
            eq(entries.diaryId, input.diaryId),
            eq(entries.id, input.entryId),
            eq(diariesToUsers.userId, ctx.session.user.id),
          ),
        )
        .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId));
      return entry ?? null;
    }),
  createEntry: protectedProcedure
    .input(z.object({ diaryId: z.number(), day: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Turn into transaction
      const res = await ctx.db
        .selectDistinct({ date: entries.day })
        .from(entries)
        .where(eq(entries.diaryId, input.diaryId))
        .innerJoin(
          diariesToUsers,
          and(
            eq(diariesToUsers.diaryId, entries.diaryId),
            eq(diariesToUsers.userId, ctx.session.user.id),
          ),
        )
        .where(eq(entries.day, input.day));
      // Only can have 1 entry per day
      if (res.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Entry already exists",
        });
      }
      const [inserted] = await ctx.db
        .insert(entries)
        .values({ diaryId: input.diaryId, day: input.day });
      return { id: inserted.insertId };
    }),
  deleteDiary: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const diariesToDelete = await ctx.db
        .select({ id: diariesToUsers.diaryId })
        .from(diariesToUsers)
        .where(
          and(
            eq(diariesToUsers.diaryId, input.diaryId),
            eq(diariesToUsers.userId, ctx.session.user.id),
          ),
        );
      if (!diariesToDelete.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Diary does not exist",
        });
      }
      await ctx.db.transaction(async (tx) => {
        await tx
          .delete(diariesToUsers)
          .where(
            and(
              eq(diariesToUsers.diaryId, input.diaryId),
              eq(diariesToUsers.userId, ctx.session.user.id),
            ),
          );
        await tx.delete(entries).where(eq(entries.diaryId, input.diaryId));
        await tx.delete(diaries).where(eq(diaries.id, input.diaryId));
      });
    }),
});
