import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { PostService } from "../repositories/post";
import { S3ImageService } from "../integrations/s3Service";
import { expandKeys } from "../integrations/s3Service";
import { getUserIdFromKey } from "../utils";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { getImageSignedUrl } from "../integrations/s3Service";
import { postsView, postsViewForForm } from "../services/postViewService";
import type {
  GetPostWithImageState,
  GetPostImageLoaded,
  GetPostImageError,
  GetPostGroupByImages,
  ImageErrorState,
  ImageLoadedState,
  EditPostWithNonEmptyImageState,
} from "../types";
import {
  type CreatePost,
  type GetPostsSchema,
  type UpdatePost,
  type DeletePostByIdInput,
} from "../schema";

export async function createPostsHandler(
  ctx: ProtectedContext,
  input: CreatePost,
) {
  const entryService = new EntryService(ctx);
  const entry = await entryService.getEntryIdById(input.entryId);

  if (!entry) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  const postService = new PostService(ctx);
  await postService.createPosts(input.entryId, input.posts);
  return await postService.getPosts(input.entryId);
}

export async function getPostsHandler(
  ctx: ProtectedContext,
  input: GetPostsSchema,
): Promise<GetPostGroupByImages[]> {
  const entryService = new EntryService(ctx);
  const [header] = await entryService.getEntryHeader(input.entryId);

  if (!header) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  const postService = new PostService(ctx);
  const posts = await postService.getPosts(input.entryId);

  const postWithImage: GetPostWithImageState[] = await Promise.all(
    posts.map(async (post) => {
      const { image, ...restOfPost } = post;

      const [err, data] = await tryCatch(getImageSignedUrl(post.image.key));
      if (err) {
        return {
          ...restOfPost,
          image: {
            type: "error",
            ...image,
          } satisfies GetPostImageError,
        };
      }

      return {
        ...restOfPost,
        image: {
          type: "loaded",
          url: data,
          ...image,
        } satisfies GetPostImageLoaded,
      };
    }),
  );
  return postsView(postWithImage);
}

export async function getPostsForFormHandler(
  ctx: ProtectedContext,
  input: GetPostsSchema,
) {
  const entryService = new EntryService(ctx);
  const [header] = await entryService.getEntryHeader(input.entryId);

  if (!header) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  const postService = new PostService(ctx);
  const posts = await postService.getPostsForForm(input.entryId);

  const postWithImage: EditPostWithNonEmptyImageState[] = await Promise.all(
    posts.map(async (post) => {
      const { image, ...restOfPost } = post;

      const [err, data] = await tryCatch(getImageSignedUrl(post.image.key));
      if (err) {
        return {
          ...restOfPost,
          isSelected: restOfPost.order === 0,
          image: {
            ...image,
            type: "error" as const,
            isSelected: image.order === 0,
          } satisfies ImageErrorState,
        };
      }

      return {
        ...restOfPost,
        isSelected: restOfPost.order === 0,
        image: {
          type: "loaded" as const,
          url: data,
          isSelected: image.order === 0,
          ...image,
        } satisfies ImageLoadedState,
      };
    }),
  );

  const result = postsViewForForm(postWithImage);

  return {
    header,
    posts: result,
  };
}

export async function updatePostsHandler(
  ctx: ProtectedContext,
  input: UpdatePost,
): Promise<void> {
  const entryService = new EntryService(ctx);
  const entryId = await entryService.getEntryIdById(input.entryId);

  if (entryId === undefined) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  const postService = new PostService(ctx);
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
}

export async function deletePostByIdHandler(
  ctx: ProtectedContext,
  input: DeletePostByIdInput,
): Promise<void> {
  const postService = new PostService(ctx);
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
}
