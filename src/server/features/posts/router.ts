import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
import { PostService } from "../diary/services/post";

export const postsRouter = createTRPCRouter({
  getPosts: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      const postService = new PostService(ctx);
      const posts = await postService.getPosts(input.entryId);

      const postWithImage = await Promise.all(
        posts.map(async (post) => {
          const { imageKey: key, name, size, mimetype, ...otherFields } = post;

          // Invariant: they're either all null or non null
          // but I'll write this way to make the types nicer
          if (
            key === null ||
            name === null ||
            size === null ||
            mimetype === null
          ) {
            return {
              ...otherFields,
              image: {
                type: "EMPTY" as const,
              },
            };
          }

          const [err, url] = await tryCatch(getImageSignedUrl(key));
          if (err) {
            return {
              ...otherFields,
              image: {
                type: "FAILED" as const,
                key,
                name,
                size,
                mimetype,
              },
            };
          }

          return {
            ...otherFields,
            image: {
              type: "SUCCESS" as const,
              key,
              name,
              size,
              mimetype,
              url,
            },
          };
        }),
      );

      return postWithImage;
    }),
});
