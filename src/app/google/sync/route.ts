// src/app/api/google/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, getFileTypeFromMimeType, formatBytes } from '@/lib/google-drive';
import { supabase } from '@/lib/supabase';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET_NAME } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

// List files from Google Drive
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('google_access_token')?.value;
    const refreshToken = cookieStore.get('google_refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    const drive = getDriveClient(accessToken, refreshToken);

    // Get folder ID from query params (optional)
    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get('folderId');

    // List files from Google Drive
    const response = await drive.files.list({
      pageSize: 100,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink)',
      q: folderId ? `'${folderId}' in parents and trashed = false` : 'trashed = false',
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];

    // Transform files to match our resource structure
    const transformedFiles = files.map(file => ({
      id: file.id,
      name: file.name || 'Untitled',
      mimeType: file.mimeType || 'application/octet-stream',
      type: getFileTypeFromMimeType(file.mimeType || ''),
      size: formatBytes(parseInt(file.size || '0')),
      sizeBytes: parseInt(file.size || '0'),
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      parents: file.parents
    }));

    return NextResponse.json({ files: transformedFiles });
  } catch (error) {
    console.error('Error listing Google Drive files:', error);
    return NextResponse.json(
      { error: 'Failed to list files from Google Drive' },
      { status: 500 }
    );
  }
}

// Sync selected files from Google Drive
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('google_access_token')?.value;
    const refreshToken = cookieStore.get('google_refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    const { files, category, department, tags } = await request.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'No files selected for sync' },
        { status: 400 }
      );
    }

    const drive = getDriveClient(accessToken, refreshToken);
    const syncedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        // 1. Download file from Google Drive
        const fileResponse = await drive.files.get({
          fileId: file.id,
          alt: 'media'
        }, {
          responseType: 'arraybuffer'
        });

        const fileBuffer = Buffer.from(fileResponse.data as ArrayBuffer);

        // 2. Generate S3 key and upload URL
        const fileExtension = file.name.split('.').pop() || 'bin';
        const s3Key = `resources/${uuidv4()}.${fileExtension}`;

        // 3. Upload to S3
        const putCommand = new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: file.mimeType || 'application/octet-stream',
        });

        await s3Client.send(putCommand);

        // 4. Generate public URL
        const publicUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

        // 5. Save metadata to database
        const { data, error } = await supabase
          .from('resources')
          .insert({
            name: file.name,
            type: file.type,
            category: category || 'General',
            department: department || 'General',
            description: `Synced from Google Drive on ${new Date().toLocaleDateString()}`,
            s3_key: s3Key,
            file_url: publicUrl,
            size: file.size,
            tags: tags || [],
            upload_date: new Date().toISOString(),
            uploaded_by: 'google-drive-sync',
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        syncedFiles.push({
          ...data,
          originalFile: file
        });

      } catch (fileError) {
        console.error(`Error syncing file ${file.name}:`, fileError);
        errors.push({
          file: file.name,
          error: fileError instanceof Error ? fileError.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: syncedFiles.length,
      errorCount: errors.length,
      syncedFiles,
      errors
    });

  } catch (error) {
    console.error('Error syncing files:', error);
    return NextResponse.json(
      { error: 'Failed to sync files from Google Drive' },
      { status: 500 }
    );
  }
}

// Get Google Drive folders
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('google_access_token')?.value;
    const refreshToken = cookieStore.get('google_refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    const drive = getDriveClient(accessToken, refreshToken);

    // List folders only
    const response = await drive.files.list({
      pageSize: 100,
      fields: 'files(id, name, parents)',
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      orderBy: 'name'
    });

    const folders = response.data.files || [];

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Error listing Google Drive folders:', error);
    return NextResponse.json(
      { error: 'Failed to list folders from Google Drive' },
      { status: 500 }
    );
  }
}