import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { env } from "~/env.mjs";
import { config } from "~/server/config";
import { s3Client } from "~/server/s3Client";
import { Readable } from "stream";

export async function getPresignedPost(
  userId: string,
  diaryId: number,
  entryId: number,
  uuid: string,
  imageMetadata: { name: string; type: string; size: number },
) {
  const filename = `${uuid}-${imageMetadata.name}`;
  const key = `${userId}/${diaryId}/${entryId}/${filename}`;
  const presignedPost = await createPresignedPost(s3Client, {
    Bucket: env.BUCKET_NAME,
    Key: key,
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
  return {
    userId,
    key,
    filename,
    url: presignedPost.url,
    fields: presignedPost.fields,
  };
}

export async function getImageSignedUrl(key: string) {
  const getCommand = new GetObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, getCommand);
}

export class S3DeleteImageError extends Error {
  constructor(msg?: string, options?: ErrorOptions) {
    super(msg, options);
    this.name = S3DeleteImageError.name;
  }
}

export async function deleteImage(key: string) {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
  });
  try {
    await s3Client.send(deleteCommand);
  } catch (e) {
    throw new S3DeleteImageError("unable to delete image from s3", {
      cause: e,
    });
  }
}

export async function getImage(
  key: string,
): Promise<
  { buffer: Buffer; mimetype: string; compressed?: string } | undefined
> {
  const getCommand = new GetObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
  });
  try {
    const data = await s3Client.send(getCommand);
    if (!data.Body) {
      throw new Error("cannot get image");
    }

    const mimetype = data.ContentType;
    if (mimetype === undefined) {
      throw new Error("mimetype is missing");
    }
    const buf = await streamToBuffer(data.Body as Readable);
    return { buffer: buf, mimetype, compressed: data?.Metadata?.compressed };
  } catch (e) {
    console.log(e);
  }
}

export async function uploadImage(
  buffer: Buffer,
  key: string,
  metadata?: Record<string, string>,
) {
  const uploadCommand = new PutObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
    Body: buffer,
    Metadata: metadata,
  });
  try {
    await s3Client.send(uploadCommand);
  } catch (e) {
    console.log(e);
    throw new Error("unable to upload image");
  }
}

// https://transang.me/modern-fetch-and-how-to-get-buffer-output-from-aws-sdk-v3-getobjectcommand/
async function streamToBuffer(stream: Readable) {
  return Buffer.concat(await stream.toArray());
}

export class S3DeleteImagesError extends Error {
  public failedKeys?: string[];
  constructor({
    msg,
    options,
    failedKeys,
  }: {
    msg?: string;
    options?: ErrorOptions;
    failedKeys?: string[];
  }) {
    super(msg, options);
    this.name = S3DeleteImagesError.name;
    this.failedKeys = failedKeys;
  }
}

export async function deleteImages(keys: { Key: string }[]) {
  const deleteCommand = new DeleteObjectsCommand({
    Bucket: env.BUCKET_NAME,
    Delete: {
      Objects: keys,
    },
  });

  try {
    const res = await s3Client.send(deleteCommand);
    const errors = res.Errors;
    if (!errors) {
      return;
    }

    const failedKeys = errors
      .filter((error) => error.Key !== undefined)
      .map((error) => error.Key!);

    throw new S3DeleteImagesError({ failedKeys: failedKeys });
  } catch (e) {
    if (!(e instanceof S3ServiceException)) {
      throw new S3DeleteImagesError({ options: { cause: e } });
    }
    if (e.$retryable !== undefined) {
      // retry
    }
  }
}
