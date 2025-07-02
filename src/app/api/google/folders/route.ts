// src/app/api/google/folders/route.ts
import { NextResponse } from 'next/server'; // We no longer need NextRequest
import { getDriveClient } from '@/lib/google-drive';
import { getValidTokens } from '../../../../lib/google-auth-helpers';

// BEFORE (Your current code)
// export async function GET(_request: NextRequest) {

// AFTER (Corrected)
// The function now takes no parameters.
export async function GET() { 
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