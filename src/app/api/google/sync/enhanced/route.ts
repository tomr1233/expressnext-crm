// src/app/api/google/sync/enhanced/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, downloadFileFromDrive } from '@/lib/google-drive';
import { ResourceOperations } from '@/lib/dynamodb-operations';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import { getValidTokens } from '@/lib/google-auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const tokens = await getValidTokens();
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { files, category, department, tags } = body;

    const drive = getDriveClient(tokens.accessToken, tokens.refreshToken);
    
    let syncedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        // Check if file already exists
        const existingResource = await ResourceOperations.getResourceByGoogleDriveId(file.id);

        if (existingResource) {
          // Check if file has been modified
          const googleModifiedTime = new Date(file.modifiedTime);
          const lastSyncedTime = new Date(existingResource.last_synced_at);

          if (googleModifiedTime > lastSyncedTime) {
            // File has been updated, sync the new version
            await updateExistingResource(file, existingResource, drive);
            updatedCount++;
          }
        } else {
          // New file, create resource
          await createNewResource(file, category, department, tags, drive);
          syncedCount++;
        }
      } catch (error) {
        console.error(`Error syncing file ${file.name}:`, error);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      updatedCount,
      errorCount
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

async function updateExistingResource(file: any, existingResource: any, drive: any) {
  // Download and upload new version
  const fileBuffer = await downloadFileFromDrive(drive, file.id, file.mimeType);
  
  // Upload to S3 (using existing key to maintain URL)
  const putCommand = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: existingResource.s3_key,
    Body: fileBuffer,
    ContentType: file.mimeType.includes('google-apps') ? 'application/pdf' : file.mimeType,
  });
  
  await s3Client.send(putCommand);
  
  // Update database record
  await ResourceOperations.updateResource(existingResource.id, {
    name: file.name,
    size: file.size ? parseInt(file.size) : existingResource.size,
    google_modified_time: file.modifiedTime,
    last_synced_at: new Date().toISOString(),
    sync_status: 'synced',
    version: (existingResource.version || 0) + 1,
  });
}

async function createNewResource(file: any, category: string, department: string, tags: string[], drive: any) {
  // Download file from Google Drive
  const fileBuffer = await downloadFileFromDrive(drive, file.id, file.mimeType);
  
  // Determine file extension
  let fileExtension = 'bin';
  if (file.mimeType.includes('pdf') || file.mimeType.includes('google-apps')) {
    fileExtension = 'pdf';
  } else if (file.name.includes('.')) {
    fileExtension = file.name.split('.').pop() || 'bin';
  }
  
  // Generate S3 key
  const s3Key = `resources/${uuidv4()}.${fileExtension}`;
  
  // Upload to S3
  const putCommand = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: file.mimeType.includes('google-apps') ? 'application/pdf' : file.mimeType,
  });
  
  await s3Client.send(putCommand);
  
  // Generate public URL
  const publicUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
  
  // Insert into database
  await ResourceOperations.createResource({
    name: file.name,
    type: getFileTypeFromMimeType(file.mimeType),
    category,
    department,
    description: `Synced from Google Drive`,
    s3_key: s3Key,
    file_url: publicUrl,
    size: file.size ? parseInt(file.size) : 0,
    tags,
    upload_date: new Date().toISOString(),
    uploaded_by: 'google-drive-sync',
    google_drive_id: file.id,
    google_modified_time: file.modifiedTime,
    last_synced_at: new Date().toISOString(),
    sync_status: 'synced',
    version: 1,
  });
}

function getFileTypeFromMimeType(mimeType: string): 'document' | 'video' | 'image' | 'other' {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType.includes('document') || 
    mimeType.includes('text') || 
    mimeType.includes('pdf') ||
    mimeType.includes('sheet') ||
    mimeType.includes('presentation') ||
    mimeType.includes('google-apps')
  ) return 'document';
  return 'other';
}