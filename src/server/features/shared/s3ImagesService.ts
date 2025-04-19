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
import { type Readable } from "stream";
import type { ProtectedContext } from "../../trpc";
import { tryCatch } from "~/app/_lib/utils/tryCatch";
import { getCompressedImageKey } from "~/app/_lib/utils/getCompressedImageKey";

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
  public retryable: boolean;
  constructor({
    msg,
    options,
    retryable,
  }: {
    msg?: string;
    options?: ErrorOptions;
    retryable: boolean;
  }) {
    super(msg, options);
    this.name = S3DeleteImagesError.name;
    this.retryable = retryable;
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

export function expandKeys(keys: string[]) {
  return keys.concat(keys.map((key) => getCompressedImageKey(key)));
}

// https://transang.me/modern-fetch-and-how-to-get-buffer-output-from-aws-sdk-v3-getobjectcommand/
async function streamToBuffer(stream: Readable) {
  return Buffer.concat(await stream.toArray());
}

export class S3DeleteImagesError extends Error {
  public failedKeys?: string[];
  public retryable: boolean;
  constructor({
    msg,
    options,
    failedKeys,
    retryable,
  }: {
    msg?: string;
    options?: ErrorOptions;
    failedKeys?: string[];
    retryable: boolean;
  }) {
    super(msg, options);
    this.name = S3DeleteImagesError.name;
    this.failedKeys = failedKeys;
    this.retryable = retryable;
  }
}

type S3Client = typeof s3Client;

export class S3ImageService {
  private ctx: ProtectedContext;
  private s3Client: S3Client;

  constructor(ctx: ProtectedContext, _s3Client: S3Client = s3Client) {
    this.ctx = ctx;
    this.s3Client = _s3Client;
  }

  public async deleteImages(keys: string[]) {
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: env.BUCKET_NAME,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
    });

    const [err, data] = await tryCatch(this.s3Client.send(deleteCommand));
    if (err) {
      if (!(err instanceof S3ServiceException)) {
        this.ctx.log("deleteImages", "error", "unexpected error occured");
        throw new S3DeleteImageError({
          options: { cause: err },
          retryable: false,
        });
      }

      if (err.$retryable !== undefined) {
        this.ctx.log(
          "deleteImages",
          "warn",
          "failed a retryable request to s3",
        );
        throw new Error("failed a retryable request to s3");
      }

      this.ctx.log(
        "deleteImages",
        "warn",
        "failed a non-retryable request to s3",
      );

      throw new Error("failed a non-retryable request to s3");
    }

    const errors = data.Errors;
    console.log({ errors });
    if (!errors) {
      console.log("1");
      return;
    }

    console.log("2");
    const failedKeys = errors
      .filter((error) => error.Key !== undefined)
      .map((error) => error.Key!);

    this.ctx.log("deleteImages", "warn", "could not delete some keys", {
      failedKeys,
    });
    throw new Error("failed to delete some keys");
  }

  public async deleteImage(key: string) {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: env.BUCKET_NAME,
      Key: key,
    });
    const [err] = await tryCatch(s3Client.send(deleteCommand));
    if (!(err instanceof S3ServiceException)) {
      this.ctx.log("deleteImage", "error", "unexpected error occured");
      throw new S3DeleteImageError({
        options: { cause: err },
        retryable: false,
      });
    }
    if (err.$retryable !== undefined) {
      this.ctx.log("deleteImage", "warn", "failed a retryable request to s3");
      throw new S3DeleteImageError({
        options: { cause: err },
        retryable: true,
      });
    }

    this.ctx.log("deleteImage", "warn", "failed a non-retryable request to s3");
    throw new S3DeleteImageError({
      options: { cause: err },
      retryable: false,
    });
  }
}
