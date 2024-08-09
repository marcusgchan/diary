import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env.mjs";
import { config } from "~/server/config";
import { s3Client } from "~/server/s3Client";

export async function getPresignedPost(
  userId: string,
  diaryId: number,
  entryId: number,
  uuid: string,
  imageMetadata: { name: string; type: string; size: number },
) {
  const presignedPost = await createPresignedPost(s3Client, {
    Bucket: env.BUCKET_NAME,
    Key: `${userId}/${diaryId}/${entryId}/${uuid}-${imageMetadata.name}`,
    Expires: config.s3.presignedUrlDuration,
    Fields: {
      acl: "private",
      "Content-Type": imageMetadata.type,
      "Content-Length": imageMetadata.size.toString(),
    },
    Conditions: [
      { bucket: env.BUCKET_NAME },
      ["starts-with", "$key", `${userId}/${diaryId}/${entryId}`],
      ["starts-with", "$Content-Type", "image/"],
      ["content-length-range", config.s3.minFileSize, config.s3.maxFileSize],
    ],
  });
  return { url: presignedPost.url, fields: presignedPost.fields };
}

export async function getImageSignedUrl(key: string) {
  const getCommand = new GetObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, getCommand);
}
