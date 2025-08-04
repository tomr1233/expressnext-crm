// src/app/api/google/webhook/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/google-drive';
import { getValidTokens } from '@/lib/google-auth-helpers';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware';

async function postHandler(_request: NextRequest, _user: AuthenticatedUser) {
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
    await drive.files.watch({
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: `${process.env.NEXT_PUBLIC_APP_URL}/api/google/webhook/callback`,
        expiration: expiration.toString(),
      },
    });

    // Store the webhook information as a resource entry for tracking
    const { error: dbError } = await supabase
      .from('resources')
      .upsert({
        name: 'google-drive-webhook',
        type: 'other',
        category: 'system',
        department: 'system',
        description: `Google Drive webhook channel: ${channelId}`,
        s3_key: `webhooks/${channelId}`,
        file_url: `webhook://${channelId}`,
        size: '0',
        tags: ['webhook', 'google-drive'],
        upload_date: new Date().toISOString(),
        uploaded_by: 'system',
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        google_drive_id: channelId, // Store channel ID here
        google_modified_time: new Date(expiration).toISOString(), // Store expiration
        version: 1
      });

    if (dbError) {
      console.error('Error storing webhook info:', dbError);
      // Don't fail the registration, just log the error
    }
    
    return NextResponse.json({
      success: true,
      channelId,
      expiration: new Date(expiration).toISOString(),
      message: 'Webhook registered successfully. Files will now sync automatically when changed.'
    });
  } catch (error) {
    console.error('Error registering webhook:', error);
    return NextResponse.json(
      { error: 'Failed to register webhook' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler);