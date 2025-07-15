// src/app/api/google/webhook/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(_request: NextRequest) {
  try {
    // Check for active webhook registrations
    const { data: webhookRecords } = await supabase
      .from('resources')
      .select('google_drive_id, google_modified_time, last_synced_at')
      .eq('name', 'google-drive-webhook')
      .eq('category', 'system')
      .eq('sync_status', 'synced');

    let active = false;
    let message = 'No active webhooks found';
    
    if (webhookRecords && webhookRecords.length > 0) {
      // Check if any webhooks are still valid (not expired)
      const now = Date.now();
      const activeWebhooks = webhookRecords.filter(webhook => {
        if (!webhook.google_modified_time) return false;
        const expiration = new Date(webhook.google_modified_time).getTime();
        return expiration > now;
      });
      
      if (activeWebhooks.length > 0) {
        active = true;
        message = `Auto-sync is active with ${activeWebhooks.length} webhook(s)`;
      } else {
        message = 'Webhooks found but all have expired';
      }
    }

    // Also check for recent auto-sync activity as backup indicator
    if (!active) {
      const { data: recentAutoSync } = await supabase
        .from('resources')
        .select('sync_status, last_synced_at')
        .eq('uploaded_by', 'google-drive-auto-sync')
        .gte('last_synced_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
        .limit(1);

      if (recentAutoSync && recentAutoSync.length > 0) {
        active = true;
        message = 'Auto-sync detected based on recent activity';
      }
    }

    return NextResponse.json({
      active,
      message
    });
  } catch (error) {
    console.error('Error checking webhook status:', error);
    return NextResponse.json(
      { error: 'Failed to check webhook status' },
      { status: 500 }
    );
  }
}