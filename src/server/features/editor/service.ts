import { and, eq, exists, inArray } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  diariesToUsers,
  type EditorStates,
  editorStates,
  entries,
  type Users,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";

type TransactionContext = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface SaveEditorState {
  diaryId: number;
  entryId: number;
  editorState: string;
}

/**
 * Pure editor state domain service - only handles editor state operations
 * Cross-domain operations are handled by orchestrators
 */
export class EditorStateDomainService {
  private userId: Users["id"];
  private db: typeof db;
  private ctx: ProtectedContext;

  constructor(context: ProtectedContext) {
    this.userId = context.session.user.id;
    this.db = context.db;
    this.ctx = context;
  }

  public async saveEditorState(newEditorState: SaveEditorState) {
    await this.db
      .update(editorStates)
      .set({
        data: JSON.parse(newEditorState.editorState) as EditorStates["data"],
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(editorStates.entryId, newEditorState.entryId),
          exists(
            this.db
              .selectDistinct({ diaryId: diariesToUsers.diaryId })
              .from(diariesToUsers)
              .where(
                and(
                  eq(diariesToUsers.diaryId, newEditorState.diaryId),
                  eq(diariesToUsers.userId, this.userId),
                ),
              ),
          ),
        ),
      );
  }

  /**
   * Delete editor state by entry ID - used during entry deletion
   */
  public async deleteEditorStateByEntryId(
    entryId: number,
    tx?: TransactionContext,
  ) {
    const database = tx || this.db;
    await database
      .delete(editorStates)
      .where(eq(editorStates.entryId, entryId));
  }

  /**
   * Delete editor states by diary ID - used during diary deletion
   */
  public async deleteEditorStatesByDiaryId(
    diaryId: number,
    tx?: TransactionContext,
  ) {
    const database = tx || this.db;
    await database
      .delete(editorStates)
      .where(
        inArray(
          editorStates.entryId,
          database
            .select({ entryId: entries.id })
            .from(entries)
            .where(eq(entries.diaryId, diaryId)),
        ),
      );
  }

  /**
   * Create initial editor state for new entry
   */
  public async createInitialEditorState(entryId: number) {
    await this.db.insert(editorStates).values({ entryId });
  }
}
