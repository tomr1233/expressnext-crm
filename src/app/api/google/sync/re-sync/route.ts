// src/app/api/google/sync/re-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, downloadFileFromDrive } from '@/lib/google-drive';
import { ResourceOperations } from '@/lib/dynamodb-operations';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from '@/lib/s3';
import { getValidTokens } from '@/lib/google-auth-helpers';
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware';

async function postHandler(request: NextRequest, user: AuthenticatedUser) {
  try {
    const tokens = await getValidTokens();
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const drive = getDriveClient(tokens.accessToken, tokens.refreshToken);
    
    // Get all resources from DynamoDB
    const allResources = await ResourceOperations.getAllResources();
    
    // Filter for previously synced files that have a google_drive_id or were uploaded by google-drive-sync
    const allSyncedResources = allResources.filter(resource => 
      resource.google_drive_id || resource.uploaded_by === 'google-drive-sync'
    );

    if (!allSyncedResources || allSyncedResources.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No previously synced Google Drive files found',
        syncedCount: 0,
        updatedCount: 0,
        errorCount: 0 
      });
    }

    let syncedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: Array<{ file: string; error: string }> = [];

    for (const resource of allSyncedResources) {
      try {
        let googleFile;
        
        if (resource.google_drive_id) {
          // Get file metadata from Google Drive using stored ID
          const driveFile = await drive.files.get({
            fileId: resource.google_drive_id,
            fields: 'id,name,mimeType,size,modifiedTime,trashed'
          });
          googleFile = driveFile.data;
        } else {
          // For legacy files without google_drive_id, try to find by name
          console.log(`Attempting to find Google Drive file by name: ${resource.name}`);
          const searchResponse = await drive.files.list({
            q: `name='${resource.name.replace(/'/g, "\\'")}'`,
            fields: 'files(id,name,mimeType,size,modifiedTime,trashed)',
            pageSize: 1
          });
          
          if (!searchResponse.data.files || searchResponse.data.files.length === 0) {
            console.log(`No Google Drive file found for: ${resource.name}`);
            continue;
          }
          
          googleFile = searchResponse.data.files[0];
          
          // Update the resource with the found google_drive_id
          await ResourceOperations.updateResource(resource.id, { 
            google_drive_id: googleFile.id 
          });
          
          console.log(`Found and linked Google Drive file: ${resource.name} -> ${googleFile.id}`);
        }

        // Skip if file is trashed
        if (googleFile.trashed) {
          console.log(`Skipping trashed file: ${resource.name}`);
          continue;
        }

        // Check if file has been modified since last sync
        const googleModifiedTime = new Date(googleFile.modifiedTime || '');
        const lastSyncedTime = new Date(resource.last_synced_at || resource.upload_date);

        if (googleModifiedTime > lastSyncedTime) {
          console.log(`Re-syncing updated file: ${resource.name}`);
          
          // Download file from Google Drive
          const fileBuffer = await downloadFileFromDrive(drive, googleFile.id!, googleFile.mimeType || '');
          
          // Upload to S3 (using existing key to maintain URL)
          const putCommand = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: resource.s3_key,
            Body: fileBuffer,
            ContentType: (googleFile.mimeType || '').includes('google-apps') ? 'application/pdf' : googleFile.mimeType,
          });
          
          await s3Client.send(putCommand);
          
          // Update database record
          await ResourceOperations.updateResource(resource.id, {
            name: googleFile.name || resource.name,
            size: googleFile.size ? googleFile.size.toString() : resource.size,
            google_drive_id: googleFile.id, // Ensure this is always set
            google_modified_time: googleFile.modifiedTime,
            last_synced_at: new Date().toISOString(),
            sync_status: 'synced',
            version: (resource.version || 0) + 1,
          });

          updatedCount++;
        } else {
          // Update last_synced_at to current time even if file wasn't modified
          await ResourceOperations.updateResource(resource.id, {
            google_drive_id: googleFile.id, // Ensure this is set even for unchanged files
            last_synced_at: new Date().toISOString(),
          });

          syncedCount++;
        }
      } catch (error) {
        console.error(`Error re-syncing file ${resource.name}:`, error);
        errors.push({ 
          file: resource.name, 
          error: error instanceof Error ? error.message : String(error) 
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Re-sync completed: ${updatedCount} updated, ${syncedCount} checked, ${errorCount} errors`,
      syncedCount,
      updatedCount,
      errorCount,
      totalFiles: allSyncedResources.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Re-sync error:', error);
    return NextResponse.json({ 
      error: 'Re-sync failed: ' + (error instanceof Error ? error.message : String(error)) 
    }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);