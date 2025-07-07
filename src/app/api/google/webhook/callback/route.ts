// src/app/api/google/webhook/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    
    // Verify the webhook is from Google
    const channelId = headersList.get('x-goog-channel-id');
    const resourceState = headersList.get('x-goog-resource-state');
    const resourceId = headersList.get('x-goog-resource-id');

    if (!channelId || !resourceState) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
    }

    // Handle different resource states
    switch (resourceState) {
      case 'sync':
        // Initial sync message, just acknowledge
        console.log('Webhook sync received');
        break;
        
      case 'add':
      case 'update':
        // File was added or updated
        await handleFileUpdate(resourceId);
        break;
        
      case 'remove':
      case 'trash':
        // File was removed or trashed
        await handleFileRemoval(resourceId);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleFileUpdate(fileId: string | null) {
  if (!fileId) return;

  // Mark the file as pending sync
  const { error } = await supabase
    .from('resources')
    .update({ sync_status: 'pending' })
    .eq('google_drive_id', fileId);

  if (error) {
    console.error('Error marking file for sync:', error);
  }

  // Trigger async sync process
  // You can use a job queue here or process immediately
  await syncSingleFile(fileId);
}

async function handleFileRemoval(fileId: string | null) {
  if (!fileId) return;

  // Mark the resource as deleted or remove it
  const { error } = await supabase
    .from('resources')
    .update({ sync_status: 'deleted' })
    .eq('google_drive_id', fileId);

  if (error) {
    console.error('Error marking file as deleted:', error);
  }
}