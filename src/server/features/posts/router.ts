import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/trpc";
import { EntryDomainService } from "~/server/features/entries/service";
import { PostDomainService } from "~/server/features/posts/service";
import { S3ImageService, expandKeys } from "../shared/s3ImagesService";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { getUserIdFromKey } from "~/server/features/shared/utils";
import { createPostSchema, updatePostSchema, getPostsSchema } from "./schema";
import { getPostsController } from "./controllers/getPosts";
import { getPostsForFormController } from "./controllers/getPostsForForm";

export const postsRouter = createTRPCRouter({
  createPosts: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const entryService = new EntryDomainService(ctx);
      const entry = await entryService.getEntryIdById(input.entryId);
      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const postService = new PostDomainService(ctx);
      await postService.createPosts(input.entryId, input.posts);
      return await postService.getPosts(input.entryId);
    }),

  deletePostById: protectedProcedure
    .input(z.object({ postId: z.string(), imageKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const postService = new PostDomainService(ctx);
      const postId = await postService.getPostById(input.postId);
      if (postId === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // verify image key
      const userId = getUserIdFromKey(input.imageKey);
      if (userId === null || userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await postService.flagPostForDeletion(input.postId);

      const s3Service = new S3ImageService(ctx);

      const [err] = await tryCatch(
        s3Service.deleteImages(expandKeys([input.imageKey])),
      );
      if (!err) {
        await postService.deletePostById(input.postId);
      }
    }),

  getPostsForForm: protectedProcedure
    .input(getPostsSchema)
    .query(async ({ ctx, input }) => {
      return await getPostsForFormController(ctx, input);
    }),

  getPosts: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getPostsController(ctx, input);
    }),

  updatePosts: protectedProcedure
    .input(updatePostSchema)
    .mutation(async ({ ctx, input }) => {
      const entryService = new EntryDomainService(ctx);
      const entryId = await entryService.getEntryIdById(input.entryId);

      if (entryId === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const postService = new PostDomainService(ctx);
      const posts = await postService.getPostsForForm(input.entryId);

      // Find posts that need to be deleted (posts that exist in the database but not in the input)
      const postsToDelete = posts
        .filter((post) => !input.posts.some(({ id }) => id === post.id))
        .map((post) => post.id);

      const oldImages = posts.flatMap((post) => post.image);
      const currentImages = input.posts.flatMap((post) => post.images);
      const imageKeysToFlag = oldImages
        .filter(
          (oldImage) =>
            !currentImages.some((newImage) => newImage.key === oldImage.key),
        )
        .map((image) => image.key);

      // Create/update the remaining posts
      await postService.upsertPosts(
        input.entryId,
        postsToDelete,
        imageKeysToFlag,
        input.posts,
      );
    }),
});
