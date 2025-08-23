import { type ProtectedContext } from "~/server/trpc";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { DiaryDomainService } from "~/server/features/diaries/service";
import { EntryDomainService } from "~/server/features/entries/service";
import { PostDomainService } from "~/server/features/posts/service";
import { ImageDomainService } from "~/server/features/images/service";
import { EditorStateDomainService } from "~/server/features/editor/service";

/**
 * Orchestrates cross-domain operations for diary management
 * Coordinates between multiple domain services to handle complex operations
 */
export class DiaryOrchestrator {
  private diaryService: DiaryDomainService;
  private entryService: EntryDomainService;
  private postService: PostDomainService;
  private imageService: ImageDomainService;
  private editorService: EditorStateDomainService;
  private ctx: ProtectedContext;

  constructor(ctx: ProtectedContext) {
    this.ctx = ctx;
    this.diaryService = new DiaryDomainService(ctx);
    this.entryService = new EntryDomainService(ctx);
    this.postService = new PostDomainService(ctx);
    this.imageService = new ImageDomainService(ctx);
    this.editorService = new EditorStateDomainService(ctx);
  }

  /**
   * Create a new diary with all necessary associations
   */
  async createDiary(name: string) {
    return await this.diaryService.createDiary(name);
  }

  /**
   * Get all diaries for the current user
   */
  async getDiaries() {
    return await this.diaryService.getDiaries();
  }

  /**
   * Get a specific diary by ID
   */
  async getDiary(diaryId: number) {
    return await this.diaryService.getDiaryById(diaryId);
  }

  /**
   * Edit diary name
   */
  async editDiary(diaryId: number, name: string) {
    return await this.diaryService.editDiaryName(diaryId, name);
  }

  /**
   * Verify user has access to diary
   */
  async verifyDiaryAccess(diaryId: number) {
    return await this.diaryService.verifyDiaryAccess(diaryId);
  }

  /**
   * Delete a diary and all its related data
   * This coordinates deletion across all domains in the correct order
   */
  async deleteDiary(diaryId: number) {
    const [err] = await tryCatch(
      this.ctx.db.transaction(async (tx) => {
        // Delete in order to respect foreign key constraints
        // 1. Delete editor states (no foreign key dependencies)
        await this.editorService.deleteEditorStatesByDiaryId(diaryId, tx);

        // 2. Delete post-image associations
        await this.imageService.deletePostImagesByDiaryId(diaryId, tx);

        // 3. Delete posts
        await this.postService.deletePostsByDiaryId(diaryId, tx);

        // 4. Delete image metadata
        await this.imageService.deleteImageMetadataByDiaryId(diaryId, tx);

        // 5. Delete entries
        await this.entryService.deleteEntriesByDiaryId(diaryId, tx);

        // 6. Finally delete the diary itself
        await this.diaryService.deleteDiaryOnly(diaryId, tx);
      }),
    );

    if (err) {
      this.ctx.log(
        "deleteDiary",
        "warn",
        "unable to delete diary from database: " + err.message,
      );
      throw err;
    }
  }
}
