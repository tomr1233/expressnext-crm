// src/lib/s3.ts
import { S3Client } from "@aws-sdk/client-s3";

let s3ClientInstance: S3Client | null = null;

function validateS3Config() {
  if (!process.env.AWS_ACCESS_KEY_ID) {
    throw new Error("AWS_ACCESS_KEY_ID is not defined");
  }

  if (!process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS_SECRET_ACCESS_KEY is not defined");
  }

  if (!process.env.AWS_REGION) {
    throw new Error("AWS_REGION is not defined");
  }

  if (!process.env.S3_BUCKET_NAME) {
    throw new Error("S3_BUCKET_NAME is not defined");
  }
}

export const s3Client = new Proxy({} as S3Client, {
  get(target, prop) {
    if (!s3ClientInstance) {
      validateS3Config();
      s3ClientInstance = new S3Client({
        region: process.env.AWS_REGION!,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
    }
    return s3ClientInstance[prop as keyof S3Client];
  }
});

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';