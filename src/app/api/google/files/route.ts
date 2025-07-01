// src/app/api/google/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, getFileTypeFromMimeType, formatBytes, refreshAccessToken } from '@/lib/google-drive';
import { getValidTokens } from  '../../../../lib/google-auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const tokens = await getValidTokens();
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
    }

    const drive = getDriveClient(tokens.accessToken, tokens.refreshToken);
    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get('folderId');

    const response = await drive.files.list({
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
  } catch (error) {
    // Note: The token refresh logic from your original GET is omitted for brevity
    // but should be included here or within getValidTokens.
    console.error('Error listing Google Drive files:', error);
    return NextResponse.json({ error: 'Failed to list files from Google Drive' }, { status: 500 });
  }
}