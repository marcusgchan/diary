import { and, desc, eq } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  diaries,
  type Diaries,
  diariesToUsers,
  editorStates,
  type Entries,
  entries,
  imageKeys,
  posts,
  type Users,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";
import { type CreateEntry } from "../schema";
import { TRPCError } from "@trpc/server";

export class EntryModel {
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

  public async flagEntryForDeletion(entryId: Entries["id"]) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(entries)
        .set({ deleting: true })
        .where(eq(entries.id, entryId));
      await tx
        .update(imageKeys)
        .set({ deleting: true })
        .where(eq(imageKeys.entryId, entryId));
    });
  }

  public async deleteEntry(entryId: Entries["id"]) {
    await this.db.transaction(async (tx) => {
      await tx.delete(editorStates).where(eq(editorStates.entryId, entryId));

      await tx.delete(posts).where(eq(posts.entryId, entryId));

      await tx.delete(imageKeys).where(eq(imageKeys.entryId, entryId));

      await tx.delete(entries).where(eq(entries.id, entryId));
    });
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
      .select({
        day: entries.day,
      })
      .from(entries)
      .innerJoin(diariesToUsers, eq(diariesToUsers.diaryId, entries.diaryId))
      .where(
        and(eq(entries.id, entryId), eq(diariesToUsers.userId, this.userId)),
      )
      .limit(1);
  }
}
