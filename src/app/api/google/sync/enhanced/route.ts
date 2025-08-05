// src/app/api/google/sync/enhanced/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, downloadFileFromDrive, formatBytes } from '@/lib/google-drive';
import { ResourceOperations } from '@/lib/dynamodb-operations';
import { s3Client, S3_BUCKET_NAME } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import { getValidTokens } from '@/lib/google-auth-helpers';
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware';

async function postHandler(request: NextRequest, _user: AuthenticatedUser) {
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

interface DriveFileData {
  id: string;
  name: string;
  size?: string;
  mimeType: string;
  modifiedTime: string;
  createdTime?: string;
}

interface ExistingResource {
  id: string;
  name: string;
  size?: number | string;
  s3_key: string;
  version?: number;
}

async function updateExistingResource(file: DriveFileData, existingResource: ExistingResource, drive: any) {
  // Download and upload new version
  const fileBuffer = await downloadFileFromDrive(drive, file.id, file.mimeType);
  
  // Upload to S3 (using existing key to maintain URL)
  const S3Module = await import("@aws-sdk/client-s3");
  const PutObjectCommand = (S3Module as any).PutObjectCommand;
  const putCommand = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: existingResource.s3_key,
    Body: fileBuffer,
    ContentType: file.mimeType.includes('google-apps') ? 'application/pdf' : file.mimeType,
  });
  
  await (s3Client as any).send(putCommand);
  
  // Update database record
  await ResourceOperations.updateResource(existingResource.id, {
    name: file.name,
    size: file.size || (typeof existingResource.size === 'string' ? existingResource.size : String(existingResource.size || 0)),
    google_modified_time: file.modifiedTime,
    last_synced_at: new Date().toISOString(),
    sync_status: 'synced',
    version: (existingResource.version || 0) + 1,
  });
}

async function createNewResource(file: DriveFileData, category: string, department: string, tags: string[], drive: any) {
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
  const S3Module = await import("@aws-sdk/client-s3");
  const PutObjectCommand = (S3Module as any).PutObjectCommand;
  const putCommand = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: file.mimeType.includes('google-apps') ? 'application/pdf' : file.mimeType,
  });
  
  await (s3Client as any).send(putCommand);
  
  // Generate public URL
  const publicUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
  
  // Create description from Google Drive metadata
  const createdDate = file.createdTime ? new Date(file.createdTime).toLocaleDateString() : 'Unknown';
  const modifiedDate = file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Unknown';
  const fileType = getFileTypeFromMimeType(file.mimeType);
  const sizeStr = file.size ? formatBytes(parseInt(file.size)) : 'Unknown size';
  
  const description = `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} synced from Google Drive. Created: ${createdDate}, Modified: ${modifiedDate}, Size: ${sizeStr}`;

  // Insert into database
  await ResourceOperations.createResource({
    name: file.name,
    type: getFileTypeFromMimeType(file.mimeType),
    category,
    department,
    description,
    s3_key: s3Key,
    file_url: publicUrl,
    size: file.size || '0',
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

export const POST = withAuth(postHandler);