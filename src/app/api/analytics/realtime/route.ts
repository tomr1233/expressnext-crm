import { NextResponse } from 'next/server';
import { googleAnalyticsService } from '@/lib/google-analytics';

export async function GET() {
  try {
    const realtimeMetrics = await googleAnalyticsService.getRealtimeMetrics();
    return NextResponse.json(realtimeMetrics);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch realtime data' },
      { status: 500 }
    );
  }
}