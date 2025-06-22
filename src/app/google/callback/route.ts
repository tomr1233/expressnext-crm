// src/app/api/google/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google-drive';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL('/resources?error=google_auth_denied', request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/resources?error=no_auth_code', request.url)
    );
  }

  try {
    const tokens = await getTokensFromCode(code);
    
    // Store tokens in cookies (in production, use a more secure method)
    const cookieStore = cookies();
    
    // Store access token (expires in 1 hour)
    cookieStore.set('google_access_token', tokens.access_token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 // 1 hour
    });

    // Store refresh token if available (for long-term access)
    if (tokens.refresh_token) {
      cookieStore.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }

    return NextResponse.redirect(
      new URL('/resources?google_connected=true', request.url)
    );
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.redirect(
      new URL('/resources?error=token_exchange_failed', request.url)
    );
  }
}