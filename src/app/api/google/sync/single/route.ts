// src/app/api/google/sync/single/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, downloadFileFromDrive } from '@/lib/google-drive';
import { ResourceOperations } from '@/lib/dynamodb-operations';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import { getValidTokens } from '@/lib/google-auth-helpers';
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware';

// Sync a single file from Google Drive to S3
async function postHandler(request: NextRequest, _user: AuthenticatedUser) {
  try {
    const { fileId } = await request.json();
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    const tokens = await getValidTokens();
    
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    const drive = getDriveClient(tokens.accessToken, tokens.refreshToken);
    
    try {
      // Get file metadata from Google Drive
      const fileResponse = await drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size,modifiedTime,parents'
      });
      
      const file = fileResponse.data;
      
      if (!file) {
        return NextResponse.json(
          { error: 'File not found in Google Drive' },
          { status: 404 }
        );
      }

      console.log(`Syncing single file: ${file.name}`);
      
      // Check if file already exists in our database
      const existingResource = await ResourceOperations.getResourceByGoogleDriveId(fileId);

      // Download file from Google Drive
      const fileBuffer = await downloadFileFromDrive(drive, fileId, file.mimeType || '');
      
      // Determine file extension
      let fileExtension = 'bin';
      if (file.mimeType?.includes('pdf') || file.mimeType?.includes('google-apps')) {
        fileExtension = 'pdf';
      } else if (file.name?.includes('.')) {
        fileExtension = file.name.split('.').pop() || 'bin';
      }
      
      // Generate S3 key (reuse existing if updating)
      const s3Key = existingResource?.s3_key || `resources/${uuidv4()}.${fileExtension}`;
      
      // Determine content type
      let contentType = file.mimeType || 'application/octet-stream';
      if (file.mimeType?.includes('google-apps')) {
        contentType = 'application/pdf';
      }
      
      console.log(`Uploading to S3 with key: ${s3Key}`);
      
      // Upload to S3
      const putCommand = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
      });
      
      await s3Client.send(putCommand);
      
      // Generate public URL
      const publicUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
      
      const resourceData = {
        name: file.name || 'Unknown',
        type: file.mimeType?.startsWith('video/') ? 'video' :
              file.mimeType?.startsWith('image/') ? 'image' :
              file.mimeType?.includes('document') || file.mimeType?.includes('text') || 
              file.mimeType?.includes('pdf') || file.mimeType?.includes('sheet') || 
              file.mimeType?.includes('presentation') ? 'document' : 'other',
        s3_key: s3Key,
        file_url: publicUrl,
        size: file.size ? parseInt(file.size) : 0,
        upload_date: new Date().toISOString(),
        uploaded_by: 'google-drive-auto-sync',
        google_drive_id: fileId,
        google_modified_time: file.modifiedTime,
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
        version: existingResource ? (existingResource.version || 1) + 1 : 1,
      };

      if (existingResource) {
        // Update existing resource
        await ResourceOperations.updateResource(existingResource.id, resourceData);
        console.log(`Successfully updated: ${file.name}`);
      } else {
        // Insert new resource
        await ResourceOperations.createResource({
          ...resourceData,
          category: 'auto-synced',
          department: 'general',
          description: 'Auto-synced from Google Drive',
          tags: ['auto-sync']
        });
        console.log(`Successfully synced new file: ${file.name}`);
      }

      return NextResponse.json({
        success: true,
        file: file.name,
        action: existingResource ? 'updated' : 'created'
      });
      
    } catch (error) {
      console.error(`Error syncing file ${fileId}:`, error);
      
      // Update sync status to failed
      const existingResource = await ResourceOperations.getResourceByGoogleDriveId(fileId);
      if (existingResource) {
        await ResourceOperations.updateResourceSyncStatus(existingResource.id, 'error');
      }
        
      throw error;
    }
  } catch (error) {
    console.error('Error in single file sync:', error);
    return NextResponse.json(
      { error: 'Failed to sync file: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler);