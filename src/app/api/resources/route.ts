// src/app/api/resources/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ResourceOperations } from "@/lib/dynamodb-operations";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3";

// GET all resources
export async function GET() {
  try {
    const resources = await ResourceOperations.getAllResources();

    // Generate signed URLs for each resource
    const resourcesWithUrls = await Promise.all(
      resources.map(async (resource) => {
        const command = new GetObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: resource.s3_key,
        });

        const downloadUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 3600, // URL expires in 1 hour
        });

        return {
          ...resource,
          download_url: downloadUrl,
        };
      })
    );

    return NextResponse.json(resourcesWithUrls);
  } catch (error) {
    console.error("Error fetching resources:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}

// POST new resource metadata
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      category,
      department,
      description,
      s3_key,
      file_url,
      size,
      tags,
    } = body;

    const resource = await ResourceOperations.createResource({
      name,
      type,
      category,
      department,
      description,
      s3_key,
      file_url,
      size,
      tags,
      upload_date: new Date().toISOString(),
      uploaded_by: "current-user", // You'll want to get this from your auth system
    });

    return NextResponse.json(resource);
  } catch (error) {
    console.error("Error creating resource:", error);
    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: 500 }
    );
  }
}

// DELETE resource
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Resource ID is required" },
        { status: 400 }
      );
    }

    // First, get the resource to find the S3 key
    const resource = await ResourceOperations.getResource(id);

    if (!resource || !resource.s3_key) {
      return NextResponse.json(
        { error: "Resource not found or missing S3 key" },
        { status: 404 }
      );
    }

    // Delete from S3
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: resource.s3_key,
      });

      await s3Client.send(deleteCommand);
      console.log(`Successfully deleted file from S3: ${resource.s3_key}`);
    } catch (s3Error) {
      console.error("Error deleting from S3:", s3Error);
      // Continue with database deletion even if S3 deletion fails
      // You might want to implement a retry mechanism or alert system here
    }

    // Delete from database
    await ResourceOperations.deleteResource(id);

    return NextResponse.json({ 
      success: true,
      message: "Resource deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return NextResponse.json(
      { error: "Failed to delete resource" },
      { status: 500 }
    );
  }
}