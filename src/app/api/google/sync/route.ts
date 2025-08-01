// src/app/api/google/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, downloadFileFromDrive } from '@/lib/google-drive';
import { ResourceOperations } from '@/lib/dynamodb-operations';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import { getValidTokens } from '@/lib/google-auth-helpers';
import lodash from 'lodash';
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware';

// Sync files from Google Drive to S3
async function postHandler(request: NextRequest, user: AuthenticatedUser) {
  try {
    const tokens = await getValidTokens();
    
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
      );
    }

    const body = await request.json();
    const { files, category, department, tags } = body;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files selected' },
      );
    }

    const drive = getDriveClient(tokens.accessToken, tokens.refreshToken);
    
    let syncedCount = 0;
    let errorCount = 0;
    const errors: Array<{ file: string; error: string }> = [];

    for (const file of files) {
      try {
        console.log(`Syncing file: ${file.name}`);
        
        // Download file from Google Drive
        const fileBuffer = await downloadFileFromDrive(drive, file.id, file.mimeType);
        
        // Determine file extension
        let fileExtension = 'bin';
        if (file.mimeType.includes('pdf') || file.mimeType.includes('google-apps')) {
          fileExtension = 'pdf'; // Google Docs are exported as PDF
        } else if (file.name.includes('.')) {
          fileExtension = file.name.split('.').pop() || 'bin';
        }
        
        // Generate S3 key
        const s3Key = `resources/${uuidv4()}.${fileExtension}`;
        
        // Determine content type
        let contentType = file.mimeType;
        if (file.mimeType.includes('google-apps')) {
          contentType = 'application/pdf'; // Since we export Google Docs as PDF
        }
        
        console.log(`Uploading to S3 with key: ${s3Key}`);
        
        // Upload to S3 without ACL (let bucket policy handle public access)
        const putCommand = new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: contentType,
        });
        
        await s3Client.send(putCommand);
        
        // Generate public URL based on your S3 bucket configuration
        const publicUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
        
        console.log(`File uploaded, saving metadata to database`);

        // Determine file type based on mimeType
        const fileType = file.mimeType?.startsWith('video/') ? 'video' :
                        file.mimeType?.startsWith('image/') ? 'image' :
                        file.mimeType?.includes('document') || file.mimeType?.includes('text') || 
                        file.mimeType?.includes('pdf') || file.mimeType?.includes('sheet') || 
                        file.mimeType?.includes('presentation') || file.mimeType?.includes('google-apps') ? 'document' : 'other';

      const localDate = new Intl.DateTimeFormat(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
      }).format(new Date());

        await ResourceOperations.createResource({
          name: file.name,
          type: fileType,
          category,
          department,
          description: `Filetype: ${lodash.startCase(lodash.toLower(fileType))}, Created: ${localDate}, Size: ${file.size ? parseInt(file.size) : 0} kb`,
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
        
        console.log(`Successfully synced: ${file.name}`);
        syncedCount++;
      } catch (error) {
        console.error(`Error syncing file ${file.name}:`, error);
        errors.push({ 
          file: file.name, 
          error: error instanceof Error ? error.message : String(error) 
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: syncedCount > 0,
      syncedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error syncing files:', error);
    return NextResponse.json(
      { error: 'Failed to sync files: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler);