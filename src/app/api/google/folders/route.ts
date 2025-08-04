import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/google-drive';
import { getValidTokens } from '@/lib/google-auth-helpers';
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware';

async function getHandler(_request: NextRequest, _user: AuthenticatedUser) {
  try {
    const tokens = await getValidTokens();
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
    }

    const drive = getDriveClient(tokens.accessToken, tokens.refreshToken);

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
    return NextResponse.json({ error: 'Failed to list folders' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);