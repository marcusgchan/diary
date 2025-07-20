import { createTRPCRouter, protectedProcedure } from "~/server/trpc";

export const postsRouter = createTRPCRouter({
  createDiary: protectedProcedure.input().mutation(async ({ ctx, input }) => {
    const diary = new DiaryService(ctx);
    await diary.createDiary(input.name);
  }),
});
