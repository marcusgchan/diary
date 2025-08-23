import { and, eq, inArray, not } from "drizzle-orm";
import { type db } from "~/server/db";
import type { ImageKeys } from "~/server/db/schema";
import {
  diariesToUsers,
  entries,
  geoData,
  imageKeys,
  postImages,
  posts,
  type Users,
} from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";

type TransactionContext = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DeleteImageMetadataError extends Error {
  constructor(msg?: string, options?: ErrorOptions) {
    super(msg, options);
    this.name = DeleteImageMetadataError.name;
  }
}

/**
 * Pure image domain service - only handles image metadata operations
 * S3 operations are handled by shared S3 service
 * Cross-domain operations are handled by orchestrators
 */
export class ImageDomainService {
  private userId: Users["id"];
  private db: typeof db;
  private ctx: ProtectedContext;

  constructor(context: ProtectedContext) {
    this.userId = context.session.user.id;
    this.db = context.db;
    this.ctx = context;
  }

  public async insertImageMetadata({
    entryId,
    key,
    dateTimeTaken,
  }: {
    entryId: number;
    key: string;
    dateTimeTaken?: string | undefined;
  }) {
    const res = await this.db
      .select({ entryId: entries.id })
      .from(diariesToUsers)
      .innerJoin(entries, eq(entries.diaryId, diariesToUsers.diaryId))
      .where(
        and(eq(diariesToUsers.userId, this.userId), eq(entries.id, entryId)),
      );

    if (res.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST" });
    }

    await this.db
      .insert(imageKeys)
      .values({
        key,
        name: "",
        mimetype: "",
        userId: this.userId,
        size: 0,
        takenAt:
          dateTimeTaken !== undefined ? new Date(dateTimeTaken) : undefined,
      })
      .onConflictDoNothing();
  }

  public async createMetadataOnImageCallback({
    entryId,
    key,
    name,
    mimetype,
    size,
    dateTimeTaken,
    compressionStatus,
    gps,
  }: {
    entryId: number;
    key: string;
    name: string;
    mimetype: string;
    size: number;
    gps?: { lat: number; lon: number };
    compressionStatus: ImageKeys["compressionStatus"];
    dateTimeTaken?: string | undefined;
  }) {
    const res = await this.db
      .select({ entryId: entries.id })
      .from(diariesToUsers)
      .innerJoin(entries, eq(entries.diaryId, diariesToUsers.diaryId))
      .where(
        and(eq(diariesToUsers.userId, this.userId), eq(entries.id, entryId)),
      );

    if (res.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST" });
    }

    await this.db.transaction(async (tx) => {
      await tx
        .insert(imageKeys)
        .values({
          key,
          name,
          mimetype,
          size,
          userId: this.userId,
          compressionStatus: compressionStatus,
          takenAt:
            dateTimeTaken !== undefined ? new Date(dateTimeTaken) : undefined,
        })
        .onConflictDoNothing();

      if (gps) {
        await tx.insert(geoData).values({
          key,
          lat: gps?.lat,
          lon: gps?.lon,
        });
      }
    });
  }

  public async getUnlinkedImages({
    entryId,
    keys,
  }: {
    entryId: number;
    keys: string[];
  }) {
    return await this.db
      .select({
        key: imageKeys.key,
        compressionStatus: imageKeys.compressionStatus,
      })
      .from(imageKeys)
      .where(
        and(
          not(
            inArray(
              imageKeys.key,
              this.db
                .select({ key: postImages.imageKey })
                .from(postImages)
                .innerJoin(posts, eq(posts.id, postImages.postId))
                .where(eq(posts.entryId, entryId)),
            ),
          ),
          inArray(imageKeys.key, keys),
        ),
      );
  }

  public async insertImageMetadataWithGps({
    lat,
    lon,
    key,
    dateTimeTaken,
  }: {
    key: string;
    lat: number;
    lon: number;
    dateTimeTaken: string | undefined;
  }) {
    await this.db.transaction(async (tx) => {
      await tx.insert(imageKeys).values({
        key,
        name: "",
        compressionStatus: "failure",
        mimetype: "",
        size: 0,
        userId: this.userId,
        takenAt:
          dateTimeTaken !== undefined ? new Date(dateTimeTaken) : undefined,
      });

      await tx.insert(geoData).values({
        key,
        lat,
        lon,
      });
    });
  }

  public async deleteImageMetadata(key: string) {
    try {
      await this.db.delete(imageKeys).where(eq(imageKeys.key, key));
    } catch (e) {
      throw new DeleteImageMetadataError("unable to delete image metadata", {
        cause: e,
      });
    }
  }

  public async getImageUploadStatus(key: string) {
    const res = await this.db
      .select({ key: imageKeys.key })
      .from(imageKeys)
      .where(eq(imageKeys.key, key))
      .limit(1);

    return res.length > 0 ? "uploaded" : "pending";
  }

  public async cancelImageUpload(key: string) {
    return this.db.delete(imageKeys).where(eq(imageKeys.key, key));
  }

  /**
   * Delete image metadata by diary ID - used during diary deletion
   */
  public async deleteImageMetadataByDiaryId(
    diaryId: number,
    tx?: TransactionContext,
  ) {
    const database = tx || this.db;
    await database
      .delete(imageKeys)
      .where(
        inArray(
          imageKeys.key,
          database
            .select({ key: postImages.imageKey })
            .from(postImages)
            .innerJoin(posts, eq(posts.id, postImages.postId))
            .innerJoin(entries, eq(entries.id, posts.entryId))
            .where(eq(entries.diaryId, diaryId)),
        ),
      );
  }

  /**
   * Delete image metadata by entry ID - used during entry deletion
   */
  public async deleteImageMetadataByEntryId(
    entryId: number,
    tx?: TransactionContext,
  ) {
    const database = tx || this.db;
    await database
      .delete(imageKeys)
      .where(
        inArray(
          imageKeys.key,
          database
            .select({ key: postImages.imageKey })
            .from(postImages)
            .innerJoin(posts, eq(posts.id, postImages.postId))
            .where(eq(posts.entryId, entryId)),
        ),
      );
  }

  /**
   * Delete post images associations by entry ID
   */
  public async deletePostImagesByEntryId(
    entryId: number,
    tx?: TransactionContext,
  ) {
    const database = tx || this.db;
    await database
      .delete(postImages)
      .where(
        inArray(
          postImages.postId,
          database
            .select({ postId: posts.id })
            .from(posts)
            .where(eq(posts.entryId, entryId)),
        ),
      );
  }

  /**
   * Delete post images associations by diary ID
   */
  public async deletePostImagesByDiaryId(
    diaryId: number,
    tx?: TransactionContext,
  ) {
    const database = tx || this.db;
    await database.delete(postImages).where(
      inArray(
        postImages.postId,
        database
          .select({ postId: posts.id })
          .from(posts)
          .where(
            inArray(
              posts.entryId,
              database
                .select({ entryId: entries.id })
                .from(entries)
                .where(eq(entries.diaryId, diaryId)),
            ),
          ),
      ),
    );
  }
}
