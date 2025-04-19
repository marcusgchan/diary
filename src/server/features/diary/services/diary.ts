import { and, eq, inArray } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  diaries,
  type Diaries,
  diariesToUsers,
  type Users,
  entries,
  imageKeys,
  editorStates,
  posts,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";

export class DiaryService {
  private userId: Users["id"];
  private db: typeof db;
  private ctx: ProtectedContext;

  constructor(context: ProtectedContext) {
    this.userId = context.session.user.id;
    this.db = context.db;
    this.ctx = context;
  }

  public async createDiary(name: Diaries["name"]) {
    await this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(diaries)
        .values({ name: name })
        .returning({ insertedId: diaries.id });
      await tx.insert(diariesToUsers).values({
        userId: this.userId,
        diaryId: inserted!.insertedId,
      });
    });
  }

  public async getDiaries() {
    const diariesList = await this.db
      .select({ id: diaries.id, name: diaries.name })
      .from(diariesToUsers)
      .innerJoin(diaries, eq(diaries.id, diariesToUsers.diaryId))
      .where(
        and(
          eq(diariesToUsers.userId, this.userId),
          eq(diaries.deleting, false),
        ),
      );
    return diariesList;
  }

  public async getDiaryById(diaryId: Diaries["id"]) {
    const [diary] = await this.db
      .select({ id: diaries.id, name: diaries.name })
      .from(diaries)
      .innerJoin(diariesToUsers, eq(diaries.id, diariesToUsers.diaryId))
      .where(
        and(
          eq(diariesToUsers.diaryId, diaryId),
          eq(diariesToUsers.userId, this.userId),
        ),
      );
    return diary;
  }

  public async editDiaryName(diaryId: Diaries["id"], name: Diaries["name"]) {
    await this.db
      .update(diaries)
      .set({ name: name })
      .where(eq(diaries.id, diaryId));
  }

  public async flagDiaryForDeletion(diaryId: Diaries["id"]) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(diaries)
        .set({ deleting: true })
        .where(eq(diaries.id, diaryId));
      await tx
        .update(entries)
        .set({ deleting: true })
        .where(eq(entries.diaryId, diaryId));
      const keys = tx
        .select({ key: imageKeys.key })
        .from(diaries)
        .innerJoin(entries, eq(entries.diaryId, diaries.id))
        .innerJoin(imageKeys, eq(entries.id, imageKeys.entryId));
      await tx
        .update(imageKeys)
        .set({ deleting: true })
        .where(inArray(imageKeys.key, keys));
    });
  }

  public async deleteDiary(diaryId: Diaries["id"]) {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(editorStates)
        .where(
          inArray(
            editorStates.entryId,
            tx
              .select({ entryId: entries.id })
              .from(entries)
              .where(eq(entries.diaryId, diaryId)),
          ),
        );
      await tx
        .delete(diariesToUsers)
        .where(
          and(
            eq(diariesToUsers.diaryId, diaryId),
            eq(diariesToUsers.userId, this.userId),
          ),
        );

      await tx
        .delete(posts)
        .where(
          inArray(
            posts.entryId,
            tx
              .select({ id: entries.id })
              .from(entries)
              .where(eq(entries.diaryId, diaryId)),
          ),
        );

      await tx
        .delete(imageKeys)
        .where(
          inArray(
            imageKeys.entryId,
            tx
              .select({ id: entries.id })
              .from(entries)
              .where(eq(entries.diaryId, diaryId)),
          ),
        );

      await tx.delete(entries).where(eq(entries.diaryId, diaryId));

      await tx.delete(diaries).where(eq(diaries.id, diaryId));
    });
  }

  public async getDiaryIdById(diaryId: Diaries["id"]) {
    const [diary] = await this.db
      .select({ id: diaries.id })
      .from(diaries)
      .innerJoin(diariesToUsers, eq(diaries.id, diariesToUsers.diaryId))
      .where(
        and(
          eq(diariesToUsers.diaryId, diaryId),
          eq(diariesToUsers.userId, this.userId),
        ),
      );
    return diary;
  }
}
