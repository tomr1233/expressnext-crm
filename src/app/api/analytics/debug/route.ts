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

    const privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY || '';
    
    // Analyze private key format
    const privateKeyAnalysis = {
      length: privateKey.length,
      startsWithBegin: privateKey.startsWith('-----BEGIN'),
      endsWithEnd: privateKey.endsWith('-----'),
      hasNewlines: privateKey.includes('\n'),
      hasEscapedNewlines: privateKey.includes('\\n'),
      first50chars: privateKey.substring(0, 50),
      last50chars: privateKey.length > 50 ? privateKey.substring(privateKey.length - 50) : '',
      isLikelyBase64: !privateKey.startsWith('-----BEGIN') && privateKey.length > 100,
    };

    const envVarValues = {
      GOOGLE_ANALYTICS_PROPERTY_ID: process.env.GOOGLE_ANALYTICS_PROPERTY_ID?.substring(0, 10) + '...',
      GOOGLE_ANALYTICS_PROJECT_ID: process.env.GOOGLE_ANALYTICS_PROJECT_ID,
      GOOGLE_ANALYTICS_CLIENT_EMAIL: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
      GOOGLE_ANALYTICS_PRIVATE_KEY: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY ? 'Set (length: ' + process.env.GOOGLE_ANALYTICS_PRIVATE_KEY.length + ')' : 'Not set',
    };

    // Test private key processing
    let processedKey = '';
    let processingError = null;
    
    try {
      let testKey = privateKey;
      
      // Apply the same processing logic as the GoogleAnalyticsService
      testKey = testKey.replace(/\\n/g, '\n');
      
      if (testKey && !testKey.startsWith('-----BEGIN')) {
        testKey = Buffer.from(testKey, 'base64').toString('utf8');
      }
      
      if (testKey && !testKey.includes('\n') && testKey.includes('-----BEGIN')) {
        testKey = testKey
          .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
          .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
      }
      
      processedKey = testKey.substring(0, 100) + '...';
    } catch (error) {
      processingError = error instanceof Error ? error.message : 'Unknown processing error';
    }

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      envVarsPresent: envVars,
      envVarValues: envVarValues,
      privateKeyAnalysis,
      processedKeyPreview: processedKey,
      processingError,
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