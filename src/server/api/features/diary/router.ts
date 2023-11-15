import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  TRPCContext,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { diaries, diariesToUsers, entries } from "~/server/db/schema";

const getEntryInput = z.object({ diaryId: z.number(), entryId: z.number() });
type GetEntryInput = z.infer<typeof getEntryInput>;
async function getEntry({
  db,
  userId,
  input,
}: {
  db: TRPCContext["db"];
  userId: string;
  input: GetEntryInput;
}) {
  const [entry] = await db
    .selectDistinct({
      id: entries.id,
      day: entries.day,
      editorState: entries.editorState,
      title: entries.title,
    })
    .from(entries)
    .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
    .where(
      and(
        eq(entries.diaryId, input.diaryId),
        eq(entries.id, input.entryId),
        eq(diariesToUsers.userId, userId),
      ),
    );
  return entry ?? null;
}

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
  getDiary: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [diary] = await ctx.db
        .select({ id: diaries.id, name: diaries.name })
        .from(diaries)
        .innerJoin(diariesToUsers, eq(diaries.id, diariesToUsers.diaryId))
        .where(
          and(
            eq(diariesToUsers.diaryId, input.diaryId),
            eq(diariesToUsers.userId, ctx.session.user.id),
          ),
        );
      return diary ?? null;
    }),
  editDiary: protectedProcedure
    .input(z.object({ diaryId: z.number(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const diaryList = await tx
          .selectDistinct({ id: diaries.id })
          .from(diaries)
          .innerJoin(diariesToUsers, eq(diaries.id, diariesToUsers.diaryId))
          .where(
            and(
              eq(diariesToUsers.diaryId, input.diaryId),
              eq(diariesToUsers.userId, ctx.session.user.id),
            ),
          );
        if (diaryList.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Diary does not exist",
          });
        }
        await tx
          .update(diaries)
          .set({ name: input.name })
          .where(eq(diaries.id, input.diaryId));
      });
    }),
  deleteDiary: protectedProcedure
    .input(z.object({ diaryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const diaryList = await tx
          .selectDistinct({ id: diariesToUsers.diaryId })
          .from(diariesToUsers)
          .where(
            and(
              eq(diariesToUsers.diaryId, input.diaryId),
              eq(diariesToUsers.userId, ctx.session.user.id),
            ),
          );
        if (diaryList.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Diary does not exist",
          });
        }
        await tx.delete(entries).where(eq(entries.diaryId, input.diaryId));
        await tx
          .delete(diariesToUsers)
          .where(eq(diariesToUsers.diaryId, input.diaryId));
        await tx.delete(diaries).where(eq(diaries.id, input.diaryId));
      });
    }),
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
        .orderBy(desc(entries.day))
        .innerJoin(diaries, eq(diaries.id, entries.diaryId))
        .innerJoin(diariesToUsers, eq(diaries.id, diariesToUsers.diaryId))
        .where(
          and(
            eq(entries.diaryId, input.diaryId),
            eq(diariesToUsers.userId, ctx.session.user.id),
          ),
        );
      return entriesList;
    }),
  getEntry: protectedProcedure
    .input(z.object({ diaryId: z.number(), entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getEntry({ db: ctx.db, userId: ctx.session.user.id, input });
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
            eq(entries.day, input.day),
          ),
        );
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
  saveEditorState: protectedProcedure
    .input(
      z.object({
        diaryId: z.number(),
        entryId: z.number(),
        editorState: z.string(),
        updateDate: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const query = sql`
        UPDATE diary_entry
        INNER JOIN diary_diary_to_user
        ON diary_diary_to_user.diaryId = diary_entry.diaryId
        AND diary_diary_to_user.userId = ${ctx.session.user.id}
        SET editorState = ${input.editorState}
        WHERE diary_entry.id = ${input.entryId}
        AND diary_entry.updatedAt <= ${input.updateDate}
      `;
      await ctx.db.execute(query);
      return await getEntry({ db: ctx.db, userId: ctx.session.user.id, input });
    }),
  updateEntryDate: protectedProcedure
    .input(
      z.object({
        diaryId: z.number(),
        entryId: z.number(),
        day: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const query = sql`
          UPDATE diary_entry
          INNER JOIN diary_diary_to_user
          ON diary_diary_to_user.diaryId = diary_entry.diaryId
          AND diary_diary_to_user.userId = ${ctx.session.user.id}
          SET day = ${input.day}
          WHERE diary_entry.id = ${input.entryId}
        `;
      await ctx.db.execute(query);
    }),
});
