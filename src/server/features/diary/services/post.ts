import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  diariesToUsers,
  type Entries,
  entries,
  type ImageKeys,
  imageKeys,
  postImages,
  posts,
  type Posts,
  type Users,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import type { UpdatePost, CreatePost } from "../schema";

export class PostService {
  private userId: Users["id"];
  private db: typeof db;
  private ctx: ProtectedContext;

  constructor(context: ProtectedContext) {
    this.userId = context.session.user.id;
    this.db = context.db;
    this.ctx = context;
  }

  public async getPostsForForm(entryId: Entries["id"]) {
    return await this.db
      .select({
        id: posts.id,
        title: posts.title,
        description: posts.description,
        order: posts.order,
        // Image state
        image: {
          id: postImages.id,
          key: imageKeys.key,
          name: imageKeys.name,
          mimetype: imageKeys.mimetype,
          size: imageKeys.size,
          order: postImages.order,
        },
      })
      .from(posts)
      .innerJoin(entries, eq(entries.id, posts.entryId))
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .innerJoin(postImages, eq(postImages.postId, posts.id))
      .innerJoin(imageKeys, eq(imageKeys.key, postImages.imageKey))
      .where(
        and(
          eq(posts.entryId, entryId),
          eq(diariesToUsers.userId, this.userId),
          eq(posts.deleting, false),
        ),
      )
      .orderBy(asc(posts.order));
  }

  public async getPosts(entryId: Entries["id"]) {
    return await this.db
      .select({
        id: posts.id,
        title: posts.title,
        description: posts.description,
        image: {
          id: postImages.id,
          key: imageKeys.key,
          name: imageKeys.name,
        },
      })
      .from(posts)
      .innerJoin(postImages, eq(postImages.postId, posts.id))
      .innerJoin(imageKeys, eq(imageKeys.key, postImages.imageKey))
      .innerJoin(entries, eq(entries.id, posts.entryId))
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .where(
        and(
          eq(entries.id, entryId),
          eq(diariesToUsers.userId, this.userId),
          eq(posts.deleting, false),
        ),
      );
  }

  public async getPostById(postId: Posts["id"]) {
    const [p] = await this.db
      .select({ postId: posts.id })
      .from(posts)
      .innerJoin(entries, eq(entries.id, posts.entryId))
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .where(and(eq(posts.id, postId), eq(diariesToUsers.userId, this.userId)))
      .limit(1);
    return p?.postId;
  }

  public async flagPostForDeletion(postId: Posts["id"]) {
    await this.db
      .update(posts)
      .set({ deleting: true })
      .where(eq(posts.id, postId));
  }

  public async deletePostById(postId: Posts["id"]) {
    await this.db.delete(posts).where(eq(posts.id, postId));
  }

  public async flagPostsToDeleteByIds(postIds: Posts["id"][]) {
    await this.db
      .update(posts)
      .set({ deleting: true })
      .where(inArray(posts.id, postIds));
  }

  public async deletePostsByIds(postIds: Posts["id"][]) {
    await this.db.delete(posts).where(inArray(posts.id, postIds));
  }

  public async updatePostsToDeleting(entryId: Entries["id"]) {
    await this.db
      .update(posts)
      .set({ deleting: true })
      .where(eq(posts.entryId, entryId));
  }

  public async createPosts(
    entryId: Entries["id"],
    postsToInsert: CreatePost["posts"][number][],
  ) {
    const query = this.db.transaction(async (tx) => {
      await tx.insert(posts).values(
        postsToInsert.map((post, index) => {
          return {
            id: post.id,
            entryId: entryId,
            title: post.title,
            description: post.description,
            order: index,
          };
        }),
      );

      await tx.insert(postImages).values(
        postsToInsert.flatMap((post) =>
          post.images.map((image) => ({
            ...image,
            postId: post.id,
            imageKey: image.key,
          })),
        ),
      );
    });
    const [err] = await tryCatch(query);
    if (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create posts",
      });
    }
  }

  public async upsertPosts(
    entryId: Entries["id"],
    postIdsToDelete: Posts["id"][],
    imageKeysToFlag: ImageKeys["key"][],
    postsToInsert: UpdatePost["posts"][number][],
  ) {
    const query = this.db.transaction(async (tx) => {
      // delete previous posts
      await tx
        .delete(postImages)
        .where(inArray(postImages.imageKey, imageKeysToFlag));
      await tx.delete(posts).where(inArray(posts.id, postIdsToDelete));

      // flag prev img id
      await tx
        .update(imageKeys)
        .set({ deleting: true })
        .where(inArray(imageKeys.key, imageKeysToFlag));

      await tx
        .insert(posts)
        .values(
          postsToInsert.map((post, index) => {
            return {
              id: post.id,
              entryId: entryId,
              title: post.title,
              description: post.description,
              order: index,
            };
          }),
        )
        .onConflictDoUpdate({
          target: posts.id,
          set: {
            title: sql.raw(`excluded.${posts.title.name}`),
            description: sql.raw(`excluded.${posts.description.name}`),
            order: sql.raw(`excluded.${posts.order.name}`),
          },
        })
        .returning({ id: posts.id });

      await tx
        .insert(postImages)
        .values(
          postsToInsert.flatMap((post) =>
            post.images.map((image) => ({
              ...image,
              postId: post.id,
              imageKey: image.key,
            })),
          ),
        )
        .onConflictDoNothing({ target: postImages.id });
    });
    const [err] = await tryCatch(query);
    if (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create posts",
      });
    }
  }
}
