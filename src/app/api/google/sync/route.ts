// src/app/api/google/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/google-drive';
import { supabase } from '@/lib/supabase';
import * as S3Client from "@aws-sdk/client-s3";
console.log(S3Client);
import { s3Client, S3_BUCKET_NAME } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import { drive_v3 } from 'googleapis';
import { getValidTokens } from '@/lib/google-auth-helpers'; // Helper

// Helper function to download file from Google Drive
async function downloadFileFromDrive(drive: drive_v3.Drive, fileId: string, mimeType: string) { // <-- FIX: Changed 'any' to 'drive_v3.Drive'
  try {
    // For Google Docs/Sheets/Slides, export as PDF
    const exportMimeTypes: Record<string, string> = {
      'application/vnd.google-apps.document': 'application/pdf',
      'application/vnd.google-apps.spreadsheet': 'application/pdf',
      'application/vnd.google-apps.presentation': 'application/pdf',
    };

    if (exportMimeTypes[mimeType]) {
      const response = await drive.files.export({
        fileId: fileId,
        mimeType: exportMimeTypes[mimeType]
      }, { responseType: 'arraybuffer' });
      return Buffer.from(response.data as ArrayBuffer);
    } else {
      // For regular files, download directly
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'arraybuffer' });
      return Buffer.from(response.data as ArrayBuffer);
    }
  } catch (error) {
    console.error('Error downloading file from Drive:', error);
    throw error;
  }
}

// Sync files from Google Drive to S3
export async function POST(request: NextRequest) {
  try {
    const tokens = await getValidTokens();
    
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { files, category, department, tags } = body;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files selected' },
        { status: 400 }
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
        
        const { error: dbError } = await supabase
          .from('resources')
          .insert({
            name: file.name,
            type: file.type,
            category,
            department,
            description: `Synced from Google Drive`,
            s3_key: s3Key,
            file_url: publicUrl,
            size: file.size,
            tags,
            upload_date: new Date().toISOString(),
            uploaded_by: 'google-drive-sync',
          })
          .select()
          .single();
        
        if (dbError) {
          console.error(`Database error for file ${file.name}:`, dbError);
          throw new Error(`Database error: ${dbError.message}`);
        }
        
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