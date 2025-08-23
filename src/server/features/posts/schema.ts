import { z } from "zod";

export const createPostSchema = z.object({
  entryId: z.number(),
  posts: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      images: z
        .object({
          type: z.string(),
          id: z.string(),
          key: z.string(),
          order: z.number().int(),
        })
        .array(),
    })
    .array(),
});
export type CreatePost = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  entryId: z.number(),
  posts: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      images: z
        .object({
          id: z.string(),
          key: z.string(),
          order: z.number().int(),
        })
        .array(),
    })
    .array(),
});
export type UpdatePost = z.infer<typeof updatePostSchema>;

export const getPostsSchema = z.object({
  entryId: z.number(),
});
export type GetPostsSchema = z.infer<typeof getPostsSchema>;
