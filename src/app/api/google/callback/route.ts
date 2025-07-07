// src/app/api/google/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google-drive';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL('/resources?error=google_auth_denied', request.nextUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/resources?error=no_auth_code', request.nextUrl.origin)
    );
  }

  try {
    const tokens = await getTokensFromCode(code);
    
    // Store tokens in cookies (in production, use a more secure method)
    const cookieStore = await cookies();
    
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

    // Store tokens in database for server-side operations (cron jobs)
    try {
      // First, deactivate any existing tokens
      await supabase
        .from('google_tokens')
        .update({ is_active: false })
        .eq('is_active', true);
      
      // Insert new tokens
      await supabase
        .from('google_tokens')
        .insert({
          access_token: tokens.access_token!,
          refresh_token: tokens.refresh_token || '',
          token_type: 'Bearer',
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
          scope: tokens.scope || 'https://www.googleapis.com/auth/drive.readonly',
          is_active: true
        });
      
      console.log('Successfully stored Google tokens in database for cron jobs');
    } catch (dbError) {
      console.error('Error storing tokens in database:', dbError);
      // Don't fail the whole process if token storage fails
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