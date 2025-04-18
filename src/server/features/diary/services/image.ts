import { and, eq } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  diaries,
  type Diaries,
  diariesToUsers,
  type Entries,
  entries,
  imageKeys,
  posts,
  type Users,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";
import { tryCatch } from "~/app/_utils/tryCatch";

export class ImageService {
  private userId: Users["id"];
  private db: typeof db;
  private ctx: ProtectedContext;

  constructor(context: ProtectedContext) {
    this.userId = context.session.user.id;
    this.db = context.db;
    this.ctx = context;
  }

  public async getImageKeysByDiaryId(diaryId: Diaries["id"]) {
    const query = await this.db
      .select({ key: imageKeys.key })
      .from(imageKeys)
      .innerJoin(entries, eq(imageKeys.entryId, entries.id))
      .innerJoin(diaries, eq(entries.diaryId, diaries.id))
      .where(eq(diaries.id, diaryId));

    return query.map(({ key }) => key);
  }

  public async getImageKeysByEntryId(entryId: Entries["id"]) {
    const query = await this.db
      .select({ key: imageKeys.key })
      .from(imageKeys)
      .where(eq(imageKeys.entryId, entryId));

    return query.map(({ key }) => key);
  }

  public async deleteFileByKey(key: string) {
    const [err] = await tryCatch(
      this.db.transaction(async (tx) => {
        await tx
          .update(posts)
          .set({ imageKey: null })
          .where(eq(posts.imageKey, key));
        await tx.delete(imageKeys).where(eq(imageKeys.key, key));
      }),
    );
    if (err) {
      this.ctx.log(
        "deleteFileByKey",
        "warn",
        "unable to delete file by key: " + err.message,
      );
      throw new Error("unable to delete file by key", { cause: err });
    }
  }

  public async getKeyByKey(key: string) {
    return await this.db
      .select({ key: imageKeys.key })
      .from(imageKeys)
      .innerJoin(entries, eq(entries.id, imageKeys.entryId))
      .innerJoin(diariesToUsers, eq(entries.diaryId, diariesToUsers.diaryId))
      .where(and(eq(imageKeys.key, key), eq(diariesToUsers.userId, this.userId)));
  }
}
