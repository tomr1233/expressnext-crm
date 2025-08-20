import { NextResponse } from 'next/server';
import { googleAnalyticsService } from '@/lib/google-analytics';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '7daysAgo';
    const endDate = searchParams.get('endDate') || 'today';

    const metrics = await googleAnalyticsService.getOverviewMetrics({
      startDate,
      endDate,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}