// src/app/api/resources/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3";

// GET all resources
export async function GET() {
  try {
    const { data: resources, error } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

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

    const { data, error } = await supabase
      .from("resources")
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
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
    const { data: resource, error: fetchError } = await supabase
      .from("resources")
      .select("s3_key")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("resources")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    // Note: You might also want to delete from S3, but that requires additional permissions
    // and error handling. For now, we'll just remove the database record.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return NextResponse.json(
      { error: "Failed to delete resource" },
      { status: 500 }
    );
  }
}