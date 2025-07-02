import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, getFileTypeFromMimeType, formatBytes } from '@/lib/google-drive';
import { getValidTokens } from '@/lib/google-auth-helpers';
import { drive_v3 } from 'googleapis';

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
    const transformedFiles = files.map((file: drive_v3.Schema$File) => ({
      id: file.id ?? undefined,
      name: file.name || 'Untitled',
      mimeType: file.mimeType || 'application/octet-stream',
      type: getFileTypeFromMimeType(file.mimeType || ''),
      size: formatBytes(parseInt(file.size || '0')),
      sizeBytes: parseInt(file.size || '0'),
      createdTime: file.createdTime ?? undefined,
      modifiedTime: file.modifiedTime ?? undefined,
      webViewLink: file.webViewLink ?? undefined,
      parents: file.parents
    }));

    return NextResponse.json({ files: transformedFiles });
  } catch (error) {
    console.error('Error listing Google Drive files:', error);
    return NextResponse.json({ error: 'Failed to list files from Google Drive' }, { status: 500 });
  }
}