// src/app/api/google/status/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
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