import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  diaries,
  diariesToUsers,
  editorStates,
  entries,
} from "~/server/db/schema";
import {
  createEntry,
  deleteEntry,
  updateEntryDate,
  getEntries,
  getEntry,
  saveEditorState,
  updateTitle,
  getEntryIdsByDate as getEntryIdByDate,
} from "./service";
import {
  createEntrySchema,
  editEntryDateSchema,
  saveEditorStateSchema,
  updateEntryTitleSchema,
} from "./schema";

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
        await tx.insert(editorStates).values({
          entryId: inserted.insertId,
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
      return await getEntries({
        db: ctx.db,
        userId: ctx.session.user.id,
        diaryId: input.diaryId,
      });
    }),
  getEntry: protectedProcedure
    .input(z.object({ diaryId: z.number(), entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getEntry({ db: ctx.db, userId: ctx.session.user.id, input });
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
      await deleteEntry({ db: ctx.db, userId: ctx.session.user.id, input });
      return input.entryId;
    }),
  saveEditorState: protectedProcedure
    .input(saveEditorStateSchema)
    .mutation(async ({ ctx, input }) => {
      await saveEditorState({ db: ctx.db, userId: ctx.session.user.id, input });
      return await getEntry({ db: ctx.db, userId: ctx.session.user.id, input });
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
});
