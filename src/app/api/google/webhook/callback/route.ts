// src/app/api/google/webhook/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ResourceOperations } from '@/lib/dynamodb-operations';

export async function POST(_request: NextRequest) {
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

  try {
    // Find the resource by google_drive_id
    const resource = await ResourceOperations.getResourceByGoogleDriveId(fileId);
    
    if (!resource) {
      console.log('No resource found for Google Drive file:', fileId);
      return;
    }

    // Mark the file as pending sync
    await ResourceOperations.updateResourceSyncStatus(resource.id, 'pending');

    // Trigger background sync by making a request to the sync endpoint
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/google/sync/single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId }),
    });

    if (!syncResponse.ok) {
      console.error('Failed to trigger background sync for file:', fileId);
    }
  } catch (error) {
    console.error('Error in handleFileUpdate:', error);
  }
}

async function handleFileRemoval(fileId: string | null) {
  if (!fileId) return;

  try {
    // Find the resource by google_drive_id
    const resource = await ResourceOperations.getResourceByGoogleDriveId(fileId);
    
    if (!resource) {
      console.log('No resource found for Google Drive file:', fileId);
      return;
    }

    // Mark the resource as deleted
    await ResourceOperations.updateResourceSyncStatus(resource.id, 'deleted');
  } catch (error) {
    console.error('Error marking file as deleted:', error);
  }
}