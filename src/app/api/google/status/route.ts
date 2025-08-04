// src/app/api/google/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware';

async function getHandler(_request: NextRequest, _user: AuthenticatedUser) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('google_access_token')?.value;

    return NextResponse.json({
      connected: !!accessToken,
    });
  } catch (error) {
    console.error('Error checking Google auth status:', error);
    return NextResponse.json(
      { connected: false },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);