// src/lib/google-drive.ts
import { google } from 'googleapis';

// Initialize OAuth2 client
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Get Drive client with user's tokens
export function getDriveClient(accessToken: string, refreshToken?: string) {
  const oauth2Client = getOAuth2Client();
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Generate auth URL for user consent
export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ],
    prompt: 'consent'
  });
}

// Exchange auth code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

// File type mapping
export function getFileTypeFromMimeType(mimeType: string): 'document' | 'video' | 'image' | 'other' {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType.includes('document') || 
    mimeType.includes('text') || 
    mimeType.includes('pdf') ||
    mimeType.includes('sheet') ||
    mimeType.includes('presentation')
  ) return 'document';
  return 'other';
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper function to download file from Google Drive
export async function downloadFileFromDrive(drive: any, fileId: string, mimeType: string) {
  try {
    // For Google Docs/Sheets/Slides, export as PDF
    const exportMimeTypes: Record<string, string> = {
      'application/vnd.google-apps.document': 'application/pdf',
      'application/vnd.google-apps.spreadsheet': 'application/pdf',
      'application/vnd.google-apps.presentation': 'application/pdf',
    };

    if (exportMimeTypes[mimeType]) {
      const response = await drive.files.export({
        fileId: fileId,
        mimeType: exportMimeTypes[mimeType]
      }, { responseType: 'arraybuffer' });
      return Buffer.from(response.data as ArrayBuffer);
    } else {
      // For regular files, download directly
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'arraybuffer' });
      return Buffer.from(response.data as ArrayBuffer);
    }
  } catch (error) {
    console.error('Error downloading file from Drive:', error);
    throw error;
  }
}