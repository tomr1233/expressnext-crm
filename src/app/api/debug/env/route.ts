import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    GOOGLE_ANALYTICS_PROPERTY_ID: process.env.GOOGLE_ANALYTICS_PROPERTY_ID ? 'SET' : 'MISSING',
    GOOGLE_ANALYTICS_PROJECT_ID: process.env.GOOGLE_ANALYTICS_PROJECT_ID ? 'SET' : 'MISSING',
    GOOGLE_ANALYTICS_CLIENT_EMAIL: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL ? 'SET' : 'MISSING',
    GOOGLE_ANALYTICS_PRIVATE_KEY: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json(envVars);
}