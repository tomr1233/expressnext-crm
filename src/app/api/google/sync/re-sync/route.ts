// src/app/api/google/sync/re-sync/route.ts
import { NextResponse } from 'next/server';
import { getDriveClient, downloadFileFromDrive } from '@/lib/google-drive';
import { supabase } from '@/lib/supabase';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from '@/lib/s3';
import { getValidTokens } from '@/lib/google-auth-helpers';

export async function POST() {
  try {
    const tokens = await getValidTokens();
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const drive = getDriveClient(tokens.accessToken, tokens.refreshToken);
    
    // Get all previously synced files that have a google_drive_id
    const { data: syncedResources, error: fetchError } = await supabase
      .from('resources')
      .select('*')
      .not('google_drive_id', 'is', null)
      .eq('sync_status', 'synced');

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch synced resources' }, { status: 500 });
    }

    if (!syncedResources || syncedResources.length === 0) {
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

    for (const resource of syncedResources) {
      try {
        // Get file metadata from Google Drive
        const driveFile = await drive.files.get({
          fileId: resource.google_drive_id,
          fields: 'id,name,mimeType,size,modifiedTime,trashed'
        });

        const googleFile = driveFile.data;

        // Skip if file is trashed
        if (googleFile.trashed) {
          console.log(`Skipping trashed file: ${resource.name}`);
          continue;
        }

        // Check if file has been modified since last sync
        const googleModifiedTime = new Date(googleFile.modifiedTime);
        const lastSyncedTime = new Date(resource.last_synced_at);

        if (googleModifiedTime > lastSyncedTime) {
          console.log(`Re-syncing updated file: ${resource.name}`);
          
          // Download file from Google Drive
          const fileBuffer = await downloadFileFromDrive(drive, googleFile.id, googleFile.mimeType);
          
          // Upload to S3 (using existing key to maintain URL)
          const putCommand = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: resource.s3_key,
            Body: fileBuffer,
            ContentType: googleFile.mimeType.includes('google-apps') ? 'application/pdf' : googleFile.mimeType,
          });
          
          await s3Client.send(putCommand);
          
          // Update database record
          const { error: updateError } = await supabase
            .from('resources')
            .update({
              name: googleFile.name,
              size: googleFile.size ? googleFile.size.toString() : resource.size,
              google_modified_time: googleFile.modifiedTime,
              last_synced_at: new Date().toISOString(),
              sync_status: 'synced',
              version: (resource.version || 0) + 1,
            })
            .eq('id', resource.id);

          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`);
          }

          updatedCount++;
        } else {
          // Update last_synced_at to current time even if file wasn't modified
          const { error: touchError } = await supabase
            .from('resources')
            .update({
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', resource.id);

          if (touchError) {
            throw new Error(`Database touch failed: ${touchError.message}`);
          }

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
      totalFiles: syncedResources.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Re-sync error:', error);
    return NextResponse.json({ 
      error: 'Re-sync failed: ' + (error instanceof Error ? error.message : String(error)) 
    }, { status: 500 });
  }
}