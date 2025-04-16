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
  type Users,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";
import { type CreateEntry } from "../schema";
import { TRPCError } from "@trpc/server";

export class ImageModel {
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
    const query = await db
      .select({ key: imageKeys.key })
      .from(imageKeys)
      .where(eq(imageKeys.entryId, entryId));

    return query.map(({ key }) => key);
  }
}
