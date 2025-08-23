import { and, eq } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  diaries,
  type Diaries,
  diariesToUsers,
  type Users,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";

type TransactionContext = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Pure diary domain service - only handles diary-specific operations
 * Cross-domain operations are handled by orchestrators
 */
export class DiaryDomainService {
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

  /**
   * Pure diary deletion - only deletes diary and diary-user relationship
   * Used by orchestrator after all related data is cleaned up
   */
  public async deleteDiaryOnly(
    diaryId: Diaries["id"],
    tx?: TransactionContext,
  ) {
    const database = tx || this.db;

    await database
      .delete(diariesToUsers)
      .where(
        and(
          eq(diariesToUsers.diaryId, diaryId),
          eq(diariesToUsers.userId, this.userId),
        ),
      );
    await database.delete(diaries).where(eq(diaries.id, diaryId));
  }

  /**
   * Check if user has access to diary
   */
  public async verifyDiaryAccess(diaryId: Diaries["id"]): Promise<boolean> {
    const diary = await this.getDiaryIdById(diaryId);
    return diary !== undefined;
  }
}
