import { and, asc, eq } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  diariesToUsers,
  type Entries,
  entries,
  imageKeys,
  posts,
  type Users,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";

export class PostModel {
  private userId: Users["id"];
  private db: typeof db;
  private ctx: ProtectedContext;

  constructor(context: ProtectedContext) {
    this.userId = context.session.user.id;
    this.db = context.db;
    this.ctx = context;
  }

  public async getPosts(entryId: Entries["id"]) {
    return await this.db
      .select({
        id: posts.id,
        title: posts.title,
        description: posts.description,
        imageKey: posts.imageKey,
      })
      .from(posts)
      .innerJoin(entries, eq(entries.id, posts.entryId))
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .where(
        and(
          eq(posts.entryId, entryId),
          eq(diariesToUsers.userId, this.userId),
          eq(posts.deleting, false),
        ),
      )
      .orderBy(asc(posts.order));
  }
  public async getPostsForForm(entryId: Entries["id"]) {
    return await this.db
      .select({
        id: posts.id,
        title: posts.title,
        description: posts.description,
        imageKey: imageKeys.key,
        name: imageKeys.name,
        mimetype: imageKeys.mimetype,
        size: imageKeys.size,
      })
      .from(posts)
      .leftJoin(imageKeys, eq(imageKeys.key, posts.imageKey))
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
}
