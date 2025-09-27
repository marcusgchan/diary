import { eq } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  entries,
  type Entries,
  geoData,
  imageKeys,
  postImages,
  posts,
  type Users,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";

export class ImageService {
  private userId: Users["id"];
  private db: typeof db;
  private ctx: ProtectedContext;

  constructor(context: ProtectedContext) {
    this.userId = context.session.user.id;
    this.db = context.db;
    this.ctx = context;
  }

  async getImagesByEntryId(entryId: Entries["id"]) {
    const foo1 = await this.db
      .select({
        entryId: entries.id,
        key: imageKeys.key,
      })
      .from(entries)
      .innerJoin(posts, eq(posts.entryId, entries.id))
      .innerJoin(postImages, eq(postImages.postId, posts.id))
      .innerJoin(imageKeys, eq(postImages.imageKey, imageKeys.key))
      // .innerJoin(geoData, eq(geoData.key, imageKeys.key))
      .where(eq(entries.id, entryId));
    console.log({ foo1 });

    return await this.db
      .select({
        id: postImages.id,
        key: imageKeys.key,
        longitude: geoData.lon,
        lattitude: geoData.lat,
        postId: postImages.postId,
      })
      .from(entries)
      .innerJoin(posts, eq(posts.entryId, entries.id))
      .innerJoin(postImages, eq(postImages.postId, posts.id))
      .innerJoin(imageKeys, eq(postImages.imageKey, imageKeys.key))
      .innerJoin(geoData, eq(geoData.key, imageKeys.key))
      .where(eq(entries.id, entryId));
  }
}
