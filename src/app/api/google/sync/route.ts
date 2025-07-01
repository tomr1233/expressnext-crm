// src/app/api/google/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, getFileTypeFromMimeType, formatBytes, refreshAccessToken } from '@/lib/google-drive';
import { supabase } from '@/lib/supabase';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';
import { drive_v3 } from 'googleapis'; // <-- FIX: Added import

// Helper function to get and validate tokens
async function getValidTokens() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('google_access_token')?.value;
  const refreshToken = cookieStore.get('google_refresh_token')?.value;

  if (!accessToken && !refreshToken) {
    return null;
  }

  // If we have a refresh token but no access token, try to refresh
  if (!accessToken && refreshToken) {
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      if (newTokens.access_token) {
        // Update the access token cookie
        cookieStore.set('google_access_token', newTokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 // 1 hour
        });
        accessToken = newTokens.access_token;
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  return { accessToken, refreshToken };
}

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

// List files from Google Drive
export async function GET(request: NextRequest) {
  try {
    const tokens = await getValidTokens();
    
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    const drive = getDriveClient(tokens.accessToken, tokens.refreshToken);

    // Get folder ID from query params (optional)
    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get('folderId');

    try {
      // List files from Google Drive
      const response = await drive.files.list({
        pageSize: 100,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink)',
        q: folderId ? `'${folderId}' in parents and trashed = false` : 'trashed = false',
        orderBy: 'modifiedTime desc'
      });

      const files = response.data.files || [];

      // Transform files to match our resource structure
      const transformedFiles = files.map((file: any) => ({
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
    } catch (driveError: unknown) { // <-- FIX: Changed 'any' to 'unknown'
      const error = driveError as { response?: { status?: number } };
      
      // If we get a 401 from Google, the token might be expired
      if (error.response?.status === 401 && tokens.refreshToken) {
        try {
          const newTokens = await refreshAccessToken(tokens.refreshToken);
          const cookieStore = await cookies();
          cookieStore.set('google_access_token', newTokens.access_token!, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60
          });

          // Retry with new token
          const newDrive = getDriveClient(newTokens.access_token!, tokens.refreshToken);
          const response = await newDrive.files.list({
            pageSize: 100,
            fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink)',
            q: folderId ? `'${folderId}' in parents and trashed = false` : 'trashed = false',
            orderBy: 'modifiedTime desc'
          });

          const files = response.data.files || [];
          const transformedFiles = files.map((file: any) => ({
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
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          return NextResponse.json(
            { error: 'Authentication expired, please reconnect Google Drive' },
            { status: 401 }
          );
        }
      }
      throw driveError;
    }
  } catch (error) {
    console.error('Error listing Google Drive files:', error);
    return NextResponse.json(
      { error: 'Failed to list files from Google Drive' },
      { status: 500 }
    );
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
        
        // Save metadata to database
        const { data: _, error: dbError } = await supabase // <-- FIX: Ignored unused 'data'
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

// Get list of Google Drive folders (for navigation)
export async function PUT(_request: NextRequest) { // <-- FIX: Ignored unused 'request'
  try {
    const tokens = await getValidTokens();
    
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    const drive = getDriveClient(tokens.accessToken, tokens.refreshToken);

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
    console.error('Error listing folders:', error);
    return NextResponse.json(
      { error: 'Failed to list folders' },
      { status: 500 }
    );
  }
}