import { and, desc, eq } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  diaries,
  type Diaries,
  diariesToUsers,
  editorStates,
  type Entries,
  entries,
  type Users,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";

type TransactionContext = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateEntry {
  diaryId: number;
  day: string;
}

export interface UpdateEntryTitle {
  diaryId: number;
  entryId: number;
  title: string;
}

export interface EditEntryDate {
  diaryId: number;
  entryId: number;
  day: string;
}

/**
 * Pure entry domain service - only handles entry-specific operations
 * Cross-domain operations are handled by orchestrators
 */
export class EntryDomainService {
  private userId: Users["id"];
  private db: typeof db;
  private ctx: ProtectedContext;

  constructor(context: ProtectedContext) {
    this.userId = context.session.user.id;
    this.db = context.db;
    this.ctx = context;
  }

  public async getEntries(diaryId: Diaries["id"]) {
    const entriesList = await this.db
      .select({
        id: entries.id,
        day: entries.day,
        title: entries.title,
        diaryId: entries.diaryId,
      })
      .from(entries)
      .orderBy(desc(entries.day))
      .innerJoin(diaries, eq(diaries.id, entries.diaryId))
      .innerJoin(diariesToUsers, eq(diaries.id, diariesToUsers.diaryId))
      .where(
        and(
          eq(entries.diaryId, diaryId),
          eq(diariesToUsers.userId, this.userId),
          eq(entries.deleting, false),
        ),
      );
    return entriesList;
  }

  public async getEntry(entryId: Entries["id"]) {
    const [entry] = await this.db
      .select({
        id: entries.id,
        day: entries.day,
        editorState: editorStates.data,
        lastUpdatedEditorState: editorStates.updatedAt,
        title: entries.title,
      })
      .from(entries)
      .leftJoin(editorStates, eq(editorStates.entryId, entries.id))
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .where(
        and(eq(entries.id, entryId), eq(diariesToUsers.userId, this.userId)),
      );

    return entry ?? null;
  }

  public async getEntryIdById(entryId: Entries["id"]) {
    const [entry] = await this.db
      .select({ id: entries.id })
      .from(entries)
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .where(
        and(
          eq(entries.id, entryId),
          eq(diariesToUsers.userId, this.userId),
          eq(diariesToUsers.diaryId, entries.diaryId),
        ),
      );
    return entry;
  }

  public async createEntry(newEntry: CreateEntry) {
    return await this.db.transaction(async (tx) => {
      const res = await tx
        .select({ date: entries.day })
        .from(entries)
        .where(eq(entries.diaryId, newEntry.diaryId))
        .innerJoin(
          diariesToUsers,
          and(
            eq(diariesToUsers.diaryId, entries.diaryId),
            eq(diariesToUsers.userId, this.userId),
            eq(entries.day, newEntry.day),
            eq(entries.deleting, false),
          ),
        )
        .limit(1);
      // Only can have 1 entry per day
      if (res.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Entry already exists",
        });
      }
      const [insertedEntry] = await tx
        .insert(entries)
        .values({ diaryId: newEntry.diaryId, day: newEntry.day })
        .returning({ insertedId: entries.id });

      // Create editor state
      await tx
        .insert(editorStates)
        .values({ entryId: insertedEntry!.insertedId });

      return { id: insertedEntry!.insertedId };
    });
  }

  public async getEntryHeader(entryId: Entries["id"]) {
    return await this.db
      .select({
        day: entries.day,
        title: entries.title,
      })
      .from(entries)
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .where(
        and(eq(entries.id, entryId), eq(diariesToUsers.userId, this.userId)),
      )
      .limit(1);
  }

  public async getEntryTitle(entryId: Entries["id"]) {
    return await this.db
      .select({
        title: entries.title,
      })
      .from(entries)
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .where(
        and(eq(entries.id, entryId), eq(diariesToUsers.userId, this.userId)),
      )
      .limit(1);
  }

  public async getEntryDay(entryId: Entries["id"]) {
    return await this.db
      .select({ day: entries.day })
      .from(entries)
      .where(eq(entries.id, entryId))
      .limit(1);
  }

  public async updateTitle(input: UpdateEntryTitle) {
    await this.db
      .update(entries)
      .set({ title: input.title })
      .where(
        and(
          eq(entries.diaryId, input.diaryId),
          eq(entries.id, input.entryId),
          eq(
            entries.diaryId,
            this.db
              .selectDistinct({ diaryId: diariesToUsers.diaryId })
              .from(diariesToUsers)
              .where(
                and(
                  eq(diariesToUsers.diaryId, entries.diaryId),
                  eq(diariesToUsers.userId, this.userId),
                ),
              ),
          ),
        ),
      );
  }

  public async updateEntryDate(input: EditEntryDate) {
    await this.db
      .update(entries)
      .set({ day: input.day })
      .where(
        and(
          eq(entries.id, input.entryId),
          eq(
            entries.diaryId,
            this.db
              .selectDistinct({ diaryId: diariesToUsers.diaryId })
              .from(diariesToUsers)
              .where(
                and(
                  eq(diariesToUsers.diaryId, entries.diaryId),
                  eq(diariesToUsers.userId, this.userId),
                ),
              ),
          ),
        ),
      );
  }

  public async getEntryIdByDate(input: {
    diaryId: number;
    entryId: number;
    day: string;
  }) {
    const [entriesWithSameDateAsInput] = await this.db
      .selectDistinct({
        id: entries.id,
      })
      .from(entries)
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .where(
        and(
          eq(entries.diaryId, input.diaryId),
          eq(entries.day, input.day),
          eq(diariesToUsers.userId, this.userId),
        ),
      );
    return entriesWithSameDateAsInput;
  }

  /**
   * Pure entry deletion - only deletes entries
   * Used by orchestrator after all related data is cleaned up
   */
  public async deleteEntryOnly(
    entryId: Entries["id"],
    tx?: TransactionContext,
  ) {
    const database = tx || this.db;
    await database.delete(entries).where(eq(entries.id, entryId));
  }

  /**
   * Delete all entries for a diary - used during diary deletion
   */
  public async deleteEntriesByDiaryId(
    diaryId: Diaries["id"],
    tx?: TransactionContext,
  ) {
    const database = tx || this.db;
    await database.delete(entries).where(eq(entries.diaryId, diaryId));
  }

  /**
   * Verify user has access to entry
   */
  public async verifyEntryAccess(entryId: Entries["id"]): Promise<boolean> {
    const entry = await this.getEntryIdById(entryId);
    return entry !== undefined;
  }
}
