import { and, eq, exists } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  diariesToUsers,
  type EditorStates,
  editorStates,
  type Users,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";
import { type SaveEditorState } from "../schema";

export class EditorStateService {
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
}
