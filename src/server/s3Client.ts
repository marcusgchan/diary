import { S3Client } from "@aws-sdk/client-s3";
import { env } from "~/env.mjs";

export const s3Client = new S3Client({
  endpoint: env.BUCKET_URL,
  forcePathStyle: true,
  region: "us-west-1",
  credentials: {
    accessKeyId: env.BUCKET_ACCESS_ID,
    secretAccessKey: env.BUCKET_SECRET_KEY,
  },
});
