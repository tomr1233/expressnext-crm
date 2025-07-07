import { cookies } from 'next/headers';
import { refreshAccessToken } from '@/lib/google-drive';
import { supabase } from '@/lib/supabase';

export async function getValidTokens() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('google_access_token')?.value;
  const refreshToken = cookieStore.get('google_refresh_token')?.value;

  if (!accessToken && !refreshToken) {
    return null;
  }

  // If we have a refresh token but no access token, try to refresh
  if (!accessToken && refreshToken) {
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      if (newTokens.access_token) {
        cookieStore.set('google_access_token', newTokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 3600 // 1 hour
        });
        accessToken = newTokens.access_token;
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  return { accessToken, refreshToken };
}

// For cron jobs and server-side operations, get tokens from database
export async function getStoredTokens() {
  try {
    const { data: tokenData, error } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error || !tokenData) {
      console.error('No stored Google tokens found:', error);
      return null;
    }

    let { access_token, refresh_token } = tokenData;

    // Check if access token is expired (assuming 1 hour expiry)
    const tokenAge = Date.now() - new Date(tokenData.updated_at).getTime();
    if (tokenAge > 3600000) { // 1 hour in milliseconds
      try {
        const newTokens = await refreshAccessToken(refresh_token);
        if (newTokens.access_token) {
          // Update stored tokens
          await supabase
            .from('google_tokens')
            .update({
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token || refresh_token,
              updated_at: new Date().toISOString()
            })
            .eq('id', tokenData.id);
          
          access_token = newTokens.access_token;
          refresh_token = newTokens.refresh_token || refresh_token;
        }
      } catch (error) {
        console.error('Failed to refresh stored token:', error);
        return null;
      }
    }

    return { accessToken: access_token, refreshToken: refresh_token };
  } catch (error) {
    console.error('Error getting stored tokens:', error);
    return null;
  }
}