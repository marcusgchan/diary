import { S3Client } from "@aws-sdk/client-s3";
import { env } from "~/env.mjs";

// Internal client - server talks to MinIO directly on Docker network
export const s3Client = new S3Client({
  endpoint: env.BUCKET_URL,
  forcePathStyle: true,
  region: "us-west-1",
  credentials: {
    accessKeyId: env.BUCKET_ACCESS_ID,
    secretAccessKey: env.BUCKET_SECRET_KEY,
  },
});

// Public client - for generating URLs the browser will use
export const s3PublicClient = new S3Client({
  endpoint: env.BUCKET_PUBLIC_URL,
  forcePathStyle: true,
  region: "us-west-1",
  credentials: {
    accessKeyId: env.BUCKET_ACCESS_ID,
    secretAccessKey: env.BUCKET_SECRET_KEY,
  },
});
