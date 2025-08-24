import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { PostService } from "../repositories/post";
import { updatePostSchema } from "../schema";

export async function updatePostsHandler(
  ctx: ProtectedContext,
  input: typeof updatePostSchema._type,
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
