import { NextResponse } from 'next/server';
import { googleAnalyticsService } from '@/lib/google-analytics';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '7daysAgo';
    const endDate = searchParams.get('endDate') || 'today';
    const limit = parseInt(searchParams.get('limit') || '5');

    const topPages = await googleAnalyticsService.getTopPages({
      startDate,
      endDate,
    }, limit);

    return NextResponse.json(topPages);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch top pages data' },
      { status: 500 }
    );
  }
}