import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envVars = {
      GOOGLE_ANALYTICS_PROPERTY_ID: !!process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
      GOOGLE_ANALYTICS_PROJECT_ID: !!process.env.GOOGLE_ANALYTICS_PROJECT_ID,
      GOOGLE_ANALYTICS_CLIENT_EMAIL: !!process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
      GOOGLE_ANALYTICS_PRIVATE_KEY: !!process.env.GOOGLE_ANALYTICS_PRIVATE_KEY,
    };

    const envVarValues = {
      GOOGLE_ANALYTICS_PROPERTY_ID: process.env.GOOGLE_ANALYTICS_PROPERTY_ID?.substring(0, 10) + '...',
      GOOGLE_ANALYTICS_PROJECT_ID: process.env.GOOGLE_ANALYTICS_PROJECT_ID,
      GOOGLE_ANALYTICS_CLIENT_EMAIL: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
      GOOGLE_ANALYTICS_PRIVATE_KEY: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY ? 'Set (length: ' + process.env.GOOGLE_ANALYTICS_PRIVATE_KEY.length + ')' : 'Not set',
    };

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      envVarsPresent: envVars,
      envVarValues: envVarValues,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}