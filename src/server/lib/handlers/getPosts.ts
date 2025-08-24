import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../repositories/entry";
import { type GetPostsSchema } from "../schema";
import { TRPCError } from "@trpc/server";
import { PostService } from "../repositories/post";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { getImageSignedUrl } from "../integrations/s3Service";
import type {
  GetPostWithImageState,
  GetPostImageLoaded,
  GetPostImageError,
  GetPostGroupByImages,
} from "../types";

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

function postsView(posts: GetPostWithImageState[]): GetPostGroupByImages[] {
  const postMap = posts.reduce((acc, cur) => {
    const post = acc.get(cur.id);
    if (!post) {
      const { image, ...rest } = cur;
      acc.set(cur.id, {
        ...rest,
        images: [{ ...image }],
      });
    }
    return acc;
  }, new Map<string, GetPostGroupByImages>());

  const postArray = Array.from(postMap.values());
  return postArray;
}
