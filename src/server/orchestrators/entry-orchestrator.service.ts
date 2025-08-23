import { type ProtectedContext } from "~/server/trpc";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import {
  EntryDomainService,
  type CreateEntry,
  type UpdateEntryTitle,
  type EditEntryDate,
} from "~/server/features/entries/service";
import { PostDomainService } from "~/server/features/posts/service";
import { ImageDomainService } from "~/server/features/images/service";
import { EditorStateDomainService } from "~/server/features/editor/service";

/**
 * Orchestrates cross-domain operations for entry management
 * Coordinates between multiple domain services to handle complex operations
 */
export class EntryOrchestrator {
  private entryService: EntryDomainService;
  private postService: PostDomainService;
  private imageService: ImageDomainService;
  private editorService: EditorStateDomainService;
  private ctx: ProtectedContext;

  constructor(ctx: ProtectedContext) {
    this.ctx = ctx;
    this.entryService = new EntryDomainService(ctx);
    this.postService = new PostDomainService(ctx);
    this.imageService = new ImageDomainService(ctx);
    this.editorService = new EditorStateDomainService(ctx);
  }

  /**
   * Get all entries for a diary
   */
  async getEntries(diaryId: number) {
    return await this.entryService.getEntries(diaryId);
  }

  /**
   * Get a specific entry by ID
   */
  async getEntry(entryId: number) {
    return await this.entryService.getEntry(entryId);
  }

  /**
   * Create a new entry with initial editor state
   */
  async createEntry(newEntry: CreateEntry) {
    return await this.entryService.createEntry(newEntry);
  }

  /**
   * Get entry title
   */
  async getEntryTitle(entryId: number) {
    return await this.entryService.getEntryTitle(entryId);
  }

  /**
   * Get entry day
   */
  async getEntryDay(entryId: number) {
    return await this.entryService.getEntryDay(entryId);
  }

  /**
   * Update entry title
   */
  async updateTitle(input: UpdateEntryTitle) {
    return await this.entryService.updateTitle(input);
  }

  /**
   * Update entry date
   */
  async updateEntryDate(input: EditEntryDate) {
    return await this.entryService.updateEntryDate(input);
  }

  /**
   * Check if entry exists by date
   */
  async getEntryIdByDate(input: {
    diaryId: number;
    entryId: number;
    day: string;
  }) {
    return await this.entryService.getEntryIdByDate(input);
  }

  /**
   * Verify user has access to entry
   */
  async verifyEntryAccess(entryId: number) {
    return await this.entryService.verifyEntryAccess(entryId);
  }

  /**
   * Delete an entry and all its related data
   * This coordinates deletion across all domains in the correct order
   */
  async deleteEntry(entryId: number) {
    const [err] = await tryCatch(
      this.ctx.db.transaction(async (tx) => {
        // Delete in order to respect foreign key constraints
        // 1. Delete editor state for this entry
        await this.editorService.deleteEditorStateByEntryId(entryId, tx);

        // 2. Delete post-image associations
        await this.imageService.deletePostImagesByEntryId(entryId, tx);

        // 3. Delete posts for this entry
        await this.postService.deletePostsByEntryId(entryId, tx);

        // 4. Delete image metadata for this entry
        await this.imageService.deleteImageMetadataByEntryId(entryId, tx);

        // 5. Finally delete the entry itself
        await this.entryService.deleteEntryOnly(entryId, tx);
      }),
    );

    if (err) {
      this.ctx.log(
        "deleteEntry",
        "warn",
        "unable to delete entry from database: " + err.message,
      );
      throw err;
    }
  }
}
