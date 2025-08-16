import { type ProtectedContext } from "~/server/trpc";
import { EntryService } from "../services/entry";
import { type GetPostsSchema } from "../schema";
import { TRPCError } from "@trpc/server";
import { PostService } from "../services/post";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { getImageSignedUrl } from "../../shared/s3ImagesService";
import type {
  GetPostWithImageState,
  GetPostImageLoaded,
  GetPostImageError,
  GetPostGroupByImages,
} from "../types";

export async function getPostsController(
  ctx: ProtectedContext,
  input: GetPostsSchema,
) {
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

  // return postsView(postWithImage);

  return [
    {
      id: "post-1",
      title: "Mountain Adventure",
      description:
        "A beautiful hiking trip through the Rocky Mountains. The weather was perfect and the views were breathtaking. We saw wildlife including deer and various bird species.",
      images: [
        {
          type: "loaded",
          id: "img-1",
          url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
          key: "user-123/diary-456/entry-789/mountain-view-1.jpg",
          name: "mountain-view-1.jpg",
        },
        {
          type: "loaded",
          id: "img-2",
          url: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=600&fit=crop",
          key: "user-123/diary-456/entry-789/mountain-trail-2.jpg",
          name: "mountain-trail-2.jpg",
        },
      ],
    },
    {
      id: "post-2",
      title: "City Lights",
      description:
        "An evening walk through downtown. The city comes alive at night with all the neon signs and bustling streets.",
      images: [
        {
          type: "loaded",
          id: "img-3",
          url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&h=600&fit=crop",
          key: "user-123/diary-456/entry-789/city-night-1.jpg",
          name: "city-night-1.jpg",
        },
      ],
    },
    {
      id: "post-3",
      title: "Beach Day",
      description:
        "Relaxing day at the beach with friends. Perfect weather for swimming and volleyball.",
      images: [
        {
          type: "error",
          id: "img-4",
          key: "user-123/diary-456/entry-789/beach-1.jpg",
          name: "beach-1.jpg",
        },
        {
          type: "loaded",
          id: "img-5",
          url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop",
          key: "user-123/diary-456/entry-789/beach-sunset-2.jpg",
          name: "beach-sunset-2.jpg",
        },
      ],
    },
    {
      id: "post-4",
      title: "Coffee Shop Vibes",
      description:
        "Working from my favorite local coffee shop. The atmosphere is perfect for productivity.",
      images: [
        {
          type: "loaded",
          id: "img-6",
          url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop",
          key: "user-123/diary-456/entry-789/coffee-shop-1.jpg",
          name: "coffee-shop-1.jpg",
        },
      ],
    },
    {
      id: "post-5",
      title: "Garden Progress",
      description:
        "My tomatoes are finally starting to grow! It's been a rewarding experience learning about gardening.",
      images: [
        {
          type: "loaded",
          id: "img-7",
          url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop",
          key: "user-123/diary-456/entry-789/garden-tomatoes-1.jpg",
          name: "garden-tomatoes-1.jpg",
        },
        {
          type: "loaded",
          id: "img-8",
          url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&h=600&fit=crop",
          key: "user-123/diary-456/entry-789/garden-tools-2.jpg",
          name: "garden-tools-2.jpg",
        },
        {
          type: "loaded",
          id: "img-9",
          url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&h=600&fit=crop",
          key: "user-123/diary-456/entry-789/garden-overview-3.jpg",
          name: "garden-overview-3.jpg",
        },
      ],
    },
  ];
}

function postsView(posts: GetPostWithImageState[]): GetPostGroupByImages[] {
  const postMap = posts.reduce((acc, cur) => {
    const post = acc.get(cur.id);
    if (!post) {
      acc.set(cur.id, {
        ...cur,
        images: [{ ...cur.image }],
      });
    }
    return acc;
  }, new Map<string, GetPostGroupByImages>());

  const postArray = Array.from(postMap.values());
  return postArray;
}
