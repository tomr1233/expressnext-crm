// src/app/api/resources/upload-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType, fileSize } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Filename and content type are required" },
        { status: 400 }
      );
    }

    // Validate file size (optional - e.g., max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds maximum allowed size (100MB)" },
        { status: 400 }
      );
    }

    // Generate a unique key for the file
    const fileExtension = filename.split(".").pop() || "bin";
    const uniqueKey = `resources/${uuidv4()}.${fileExtension}`;

    console.log(`Generating upload URL for key: ${uniqueKey}`);

    // Create a presigned URL for uploading
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: contentType,
      // Don't include ACL here if bucket policy handles public access
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    });

    // Construct the public URL
    const publicUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueKey}`;

    return NextResponse.json({
      uploadUrl,
      key: uniqueKey,
      publicUrl,
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}