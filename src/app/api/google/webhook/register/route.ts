// src/app/api/google/webhook/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/google-drive';
import { getValidTokens } from '@/lib/google-auth-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const tokens = await getValidTokens();
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const drive = getDriveClient(tokens.accessToken, tokens.refreshToken);
    
    // Generate a unique channel ID
    const channelId = uuidv4();
    const expiration = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now

    // Register webhook for changes
    const response = await drive.files.watch({
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: `${process.env.NEXT_PUBLIC_APP_URL}/api/google/webhook/callback`,
        expiration: expiration.toString(),
      },
    });

    // Store the channel information in your database
    // You'll need to create a table to track active webhooks
    
    return NextResponse.json({
      success: true,
      channelId,
      expiration: new Date(expiration).toISOString()
    });
  } catch (error) {
    console.error('Error registering webhook:', error);
    return NextResponse.json(
      { error: 'Failed to register webhook' },
      { status: 500 }
    );
  }
}