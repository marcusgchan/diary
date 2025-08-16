import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../services/entry";
import { type GetPostsSchema } from "../schema";
import { TRPCError } from "@trpc/server";
import { PostService } from "../services/post";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { getImageSignedUrl } from "../../shared/s3ImagesService";

type PostWithoutImage = Awaited<
  ReturnType<PostService["getPostsForForm"]>
>[number];

export type ImageLoadedState = {
  type: "loaded";
  id: string;
  name: string;
  size: number;
  mimetype: string;
  url: string;
  order: number;
  key: string;
  isSelected: boolean;
};
export type ImageUploadingState = {
  type: "uploading";
  id: string;
  name: string;
  size: number;
  mimetype: string;
  order: number;
  key: string;
  isSelected: boolean;
};
export type ImageErrorState = {
  type: "error";
  id: string;
  key?: string;
  isSelected: boolean;
};
type PostWithImage = Omit<PostWithoutImage, "imageKey"> & {
  image: ImageLoadedState | ImageErrorState;
};

export type PostGroupByImages = Pick<
  PostWithImage,
  "id" | "title" | "description" | "order" | "isSelected"
> & {
  images: ((ImageLoadedState | ImageErrorState) & {
    isSelected: boolean;
  })[];
};

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

  const postWithImage: PostWithImage[] = await Promise.all(
    posts.map(async (post) => {
      const { image, ...restOfPost } = post;

      const [err, data] = await tryCatch(getImageSignedUrl(post.image.key));
      if (err) {
        return {
          ...restOfPost,
          image: {
            type: "error" as const,
            ...image,
          } satisfies ImageErrorState,
        };
      }

      return {
        ...restOfPost,
        image: {
          type: "loaded" as const,
          url: data,
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

function postsView(posts: PostWithImage[]): PostGroupByImages[] {
  const postMap = posts.reduce((acc, cur) => {
    const post = acc.get(cur.id);
    if (!post) {
      acc.set(cur.id, {
        ...cur,
        images: [{ ...cur.image, isSelected: cur.isSelected }],
      });
    }
    return acc;
  }, new Map<string, PostGroupByImages>());

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
