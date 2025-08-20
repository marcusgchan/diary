import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../services/entry";
import { type GetPostsSchema } from "../schema";
import { TRPCError } from "@trpc/server";
import { PostService } from "../services/post";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { getImageSignedUrl } from "../../shared/s3ImagesService";
import type {
  ImageErrorState,
  ImageLoadedState,
  EditPostWithNonEmptyImageState,
  EditPostGroupByNonEmptyImages,
} from "../types";

export async function getPostsForFormController(
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

  return {
    header,
    posts: postsView(postWithImage),
  };
}

function postsView(
  posts: EditPostWithNonEmptyImageState[],
): EditPostGroupByNonEmptyImages[] {
  const postMap = posts.reduce((acc, cur) => {
    const post = acc.get(cur.id);
    if (!post) {
      acc.set(cur.id, {
        ...cur,
        images: [{ ...cur.image }],
      });
    }
    return acc;
  }, new Map<string, EditPostGroupByNonEmptyImages>());

  const postArray = Array.from(postMap.values());

  return postArray.length === 0
    ? [
        {
          id: crypto.randomUUID(),
          order: 0,
          title: "",
          isSelected: true,
          description: "",
          images: [],
        },
      ]
    : postArray;
}
