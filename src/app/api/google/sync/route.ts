// src/app/api/google/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, getFileTypeFromMimeType, formatBytes, refreshAccessToken } from '@/lib/google-drive';
import { supabase } from '@/lib/supabase';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET_NAME } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

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
    } catch (driveError: any) {
      // If we get a 401 from Google, the token might be expired
      if (driveError.response?.status === 401 && tokens.refreshToken) {
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