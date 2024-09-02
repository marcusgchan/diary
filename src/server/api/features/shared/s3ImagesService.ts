import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
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
  const presignedPost = await createPresignedPost(s3Client, {
    Bucket: env.BUCKET_NAME,
    Key: `${userId}/${diaryId}/${entryId}/${filename}`,
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

export async function deleteImage(key: string) {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
  });

  if (env.NODE_ENV === "development" || env.NODE_ENV == "test") {
    const minioPort = env.BUCKET_URL.split(":")[2];
    if (!minioPort) {
      throw new Error("Minio port not found");
    }
    const prevEndpoint = s3Client.config.endpoint;
    s3Client.config.endpoint = `http://minio:${minioPort}` as never;
    try {
      await s3Client.send(deleteCommand);
    } catch (e) {
      console.log(e);
      s3Client.config.endpoint = prevEndpoint;
      throw new Error("unable to delete image");
    }
  } else {
    await s3Client.send(deleteCommand);
  }
}

export async function getImage(key: string): Promise<Buffer | undefined> {
  const getCommand = new GetObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
  });

  if (env.NODE_ENV === "development" || env.NODE_ENV == "test") {
    const minioPort = env.BUCKET_URL.split(":")[2];
    if (!minioPort) {
      throw new Error("Minio port not found");
    }
    const prevEndpoint = s3Client.config.endpoint;
    s3Client.config.endpoint = `http://minio:${minioPort}` as never;
    let buf: Buffer | undefined;
    try {
      let data = await s3Client.send(getCommand);
      if (!data.Body) {
        throw new Error("cannot get image");
      }

      buf = await streamToBuffer(data.Body as Readable);
    } catch (e) {
      console.log(e);
    } finally {
      s3Client.config.endpoint = prevEndpoint;
    }
    return buf;
  } else {
    try {
      let buf: Buffer;
      const data = await s3Client.send(getCommand);
      if (!data.Body) {
        throw new Error("cannot get image");
      }

      buf = await streamToBuffer(data.Body as Readable);
      return buf;
    } catch (e) {
      console.log(e);
    }
  }
}

export async function uploadImage(buffer: Buffer, key: string) {
  const uploadCommand = new PutObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
    Body: buffer,
  });
  if (env.NODE_ENV === "development" || env.NODE_ENV == "test") {
    const minioPort = env.BUCKET_URL.split(":")[2];
    if (!minioPort) {
      throw new Error("Minio port not found");
    }
    const prevEndpoint = s3Client.config.endpoint;
    s3Client.config.endpoint = `http://minio:${minioPort}` as never;
    try {
      return await s3Client.send(uploadCommand);
    } catch (e) {
      console.log(e);
      s3Client.config.endpoint = prevEndpoint;
      throw new Error("unable to upload image");
    }
  } else {
    try {
      const data = await s3Client.send(uploadCommand);
      return data;
    } catch (e) {
      console.log(e);
      throw new Error("unable to upload image");
    }
  }
}

// https://transang.me/modern-fetch-and-how-to-get-buffer-output-from-aws-sdk-v3-getobjectcommand/
async function streamToBuffer(stream: Readable) {
  return Buffer.concat(await stream.toArray());
}

export async function deleteImages(keys: { Key: string }[]) {
  const deleteCommand = new DeleteObjectsCommand({
    Bucket: env.BUCKET_NAME,
    Delete: {
      Objects: keys,
    },
  });

  if (env.NODE_ENV === "development" || env.NODE_ENV == "test") {
    const minioPort = env.BUCKET_URL.split(":")[2];
    if (!minioPort) {
      throw new Error("Minio port not found");
    }
    const prevEndpoint = s3Client.config.endpoint;
    s3Client.config.endpoint = `http://minio:${minioPort}` as never;
    try {
      await s3Client.send(deleteCommand);
    } catch (e) {
      console.log(e);
      s3Client.config.endpoint = prevEndpoint;
      throw new Error("unable to delete images");
    }
  } else {
    await s3Client.send(deleteCommand);
  }
}
