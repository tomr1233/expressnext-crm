import { NextRequest, NextResponse } from "next/server";
import { ResourceOperations } from "@/lib/dynamodb-operations";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware'
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3";
import type { Resource } from "@/lib/dynamodb";

type ResourceWithDownloadUrl = Resource & {
  download_url?: string;
};


async function getResourceById(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Resource ID is required" },
        { status: 400 }
      );
    }

    const resource = await ResourceOperations.getResource(id);

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    // Check if the resource belongs to the authenticated user
    if (resource.user_id !== user.userId) {
      return NextResponse.json(
        { error: "Forbidden - You can only access your own resources" },
        { status: 403 }
      );
    }

    // Generate signed URL if S3 key exists
    let resourceWithUrl: ResourceWithDownloadUrl = { ...resource };
    if (resource.s3_key) {
      try {
        const command = new GetObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: resource.s3_key,
        });
        const downloadUrl = await getSignedUrl(s3Client as S3Client, command as Parameters<typeof getSignedUrl>[1], {
          expiresIn: 3600, // URL expires in 1 hour
        });

        resourceWithUrl = {
          ...resource,
          download_url: downloadUrl,
        };
      } catch (s3Error) {
        console.error("Error generating signed URL:", s3Error);
        // Return resource without download URL if S3 fails
      }
    }

    return NextResponse.json(resourceWithUrl);
  } catch (error) {
    console.error("Error fetching resource:", error);
    return NextResponse.json(
      { error: "Failed to fetch resource" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getResourceById);