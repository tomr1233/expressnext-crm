// src/app/api/google/sync/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, downloadFileFromDrive } from '@/lib/google-drive';
import { ResourceOperations } from '@/lib/dynamodb-operations';
import { getStoredTokens } from '@/lib/google-auth-helpers';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from '@/lib/s3';
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware';

async function getHandler(request: NextRequest, user: AuthenticatedUser) {
  try {
    // Use stored tokens for cron jobs instead of cookies
    const tokens = await getStoredTokens();
    if (!tokens || !tokens.accessToken) {
      console.error('No stored Google tokens available for sync check');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const drive = getDriveClient(tokens.accessToken, tokens.refreshToken);
    
    // Get all resources with Google Drive IDs
    const allResources = await ResourceOperations.getAllResources();
    const resources = allResources.filter(resource => resource.google_drive_id != null);

    let updatedCount = 0;
    let checkedCount = 0;
    
    for (const resource of resources || []) {
      try {
        checkedCount++;
        
        // Get file metadata from Google Drive
        const response = await drive.files.get({
          fileId: resource.google_drive_id,
          fields: 'id, name, modifiedTime, trashed, size, mimeType'
        });

        const file = response.data;
        
        if (file.trashed) {
          // File was trashed
          await ResourceOperations.updateResourceSyncStatus(resource.id, 'deleted');
          
          console.log(`Marked resource ${resource.name} as deleted`);
        } else if (new Date(file.modifiedTime!) > new Date(resource.last_synced_at || '1970-01-01')) {
          // File was modified, sync it immediately
          await syncUpdatedFile(resource, file, drive);
          updatedCount++;
        }
      } catch (error: any) {
        console.error(`Error checking file ${resource.name}:`, error);
        if (error.code === 404) {
          // File not found, mark as deleted
          await ResourceOperations.updateResourceSyncStatus(resource.id, 'deleted');
        } else {
          // Mark as error for retry
          await ResourceOperations.updateResourceSyncStatus(resource.id, 'error');
        }
      }
    }

    return NextResponse.json({
      success: true,
      checkedCount,
      updatedCount,
      message: `Checked ${checkedCount} files, updated ${updatedCount} files`
    });
  } catch (error) {
    console.error('Sync check error:', error);
    return NextResponse.json({ error: 'Sync check failed' }, { status: 500 });
  }
}

async function syncUpdatedFile(resource: any, file: any, drive: any) {
  try {
    console.log(`Syncing updated file: ${file.name}`);
    
    // Download file from Google Drive
    const fileBuffer = await downloadFileFromDrive(drive, file.id, file.mimeType);
    
    // Upload to S3 (using existing key to maintain URL)
    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: resource.s3_key,
      Body: fileBuffer,
      ContentType: file.mimeType.includes('google-apps') ? 'application/pdf' : file.mimeType,
    });
    
    await s3Client.send(putCommand);
    
    // Update database record
    await ResourceOperations.updateResource(resource.id, {
      name: file.name,
      size: file.size ? parseInt(file.size) : resource.size,
      google_modified_time: file.modifiedTime,
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced',
      version: (resource.version || 0) + 1,
    });
    
    console.log(`Successfully synced: ${file.name}`);
  } catch (error) {
    console.error(`Error syncing file ${file.name}:`, error);
    
    // Mark as error
    await ResourceOperations.updateResourceSyncStatus(resource.id, 'error');
  }
}

export const GET = withAuth(getHandler);