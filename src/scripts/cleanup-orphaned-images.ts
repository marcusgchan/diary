import { db } from "~/server/db";
import { imageKeys, postImages, geoData } from "~/server/db/schema";
import { and, eq, notInArray, inArray, lt } from "drizzle-orm";
import { s3Client } from "~/server/lib/integrations/s3Client";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { env } from "~/env.mjs";
import { IMAGE_SIZES } from "~/app/_lib/utils/getCompressedImageKey";

async function cleanupOrphanedImages() {
  console.log("Starting orphaned image cleanup...");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get all keys that ARE linked to posts
  const linkedImages = await db
    .select({ key: postImages.imageKey })
    .from(postImages);
  const linkedKeys = linkedImages.map((img) => img.key);

  // Find orphaned images using notInArray
  const orphanedImages = await db
    .select({ key: imageKeys.key })
    .from(imageKeys)
    .where(
      and(
        linkedKeys.length > 0
          ? notInArray(imageKeys.key, linkedKeys)
          : undefined,
        lt(imageKeys.uploadAt, oneDayAgo),
        eq(imageKeys.deleting, false),
      ),
    );

  if (orphanedImages.length === 0) {
    console.log("No orphaned images found.");
    return;
  }

  console.log(`Found ${orphanedImages.length} orphaned images.`);

  const successfullyDeletedKeys: string[] = [];

  for (const img of orphanedImages) {
    const baseName = img.key.replace(/\.[^.]+$/, "");
    const keysToDelete = [
      img.key,
      ...IMAGE_SIZES.map((size) => `${baseName}-${size}w.webp`),
    ];

    try {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: env.BUCKET_NAME,
          Delete: {
            Objects: keysToDelete.map((key) => ({ Key: key })),
            Quiet: true,
          },
        }),
      );
      successfullyDeletedKeys.push(img.key);
    } catch (error) {
      console.error(`Failed to delete ${img.key} from S3:`, error);
    }
  }

  if (successfullyDeletedKeys.length > 0) {
    // Delete from geo_data first (foreign key constraint)
    await db
      .delete(geoData)
      .where(inArray(geoData.key, successfullyDeletedKeys));

    // Then delete from imageKeys
    await db
      .delete(imageKeys)
      .where(inArray(imageKeys.key, successfullyDeletedKeys));

    console.log(`Deleted ${successfullyDeletedKeys.length} images.`);
  }

  const failedCount = orphanedImages.length - successfullyDeletedKeys.length;
  if (failedCount > 0) {
    console.log(`${failedCount} failed S3 deletion - will retry next run.`);
  }

  console.log("Cleanup complete.");
}

cleanupOrphanedImages()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  });
