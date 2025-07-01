// src/lib/google-auth-helpers.ts
import { cookies } from 'next/headers';
import { refreshAccessToken } from '@/lib/google-drive';

export async function getValidTokens() {
  const cookieStore = cookies(); // Correctly call cookies() inside the async function
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