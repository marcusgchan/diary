import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { PostService } from "../repositories/post";
import { S3ImageService } from "../integrations/s3Service";
import { expandKeys } from "../integrations/s3Service";
import { getUserIdFromKey } from "../utils";
import { tryCatch } from "~/app/_lib/utils/tryCatch";

export async function deletePostByIdHandler(
  ctx: ProtectedContext,
  input: { postId: string; imageKey: string },
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
