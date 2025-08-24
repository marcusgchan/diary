import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { PostService } from "../repositories/post";
import { createPostSchema } from "../schema";

export async function createPostsHandler(
  ctx: ProtectedContext,
  input: typeof createPostSchema._type,
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
