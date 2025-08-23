import { diariesRouter } from "~/server/features/diaries/router";
import { entriesRouter } from "~/server/features/entries/router";
import { postsRouter } from "~/server/features/posts/router";
import { imagesRouter } from "~/server/features/images/router";
import { editorRouter } from "~/server/features/editor/router";
import { createTRPCRouter } from "~/server/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  diaries: diariesRouter,
  entries: entriesRouter,
  posts: postsRouter,
  images: imagesRouter,
  editor: editorRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
