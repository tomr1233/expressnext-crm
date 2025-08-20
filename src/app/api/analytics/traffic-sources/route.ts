import { NextResponse } from 'next/server';
import { googleAnalyticsService } from '@/lib/google-analytics';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '7daysAgo';
    const endDate = searchParams.get('endDate') || 'today';
    const limit = parseInt(searchParams.get('limit') || '5');

    const trafficSources = await googleAnalyticsService.getTrafficSources({
      startDate,
      endDate,
    }, limit);

    return NextResponse.json(trafficSources);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch traffic sources data' },
      { status: 500 }
    );
  }
}