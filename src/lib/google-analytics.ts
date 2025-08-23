import { BetaAnalyticsDataClient } from '@google-analytics/data';

export interface GoogleAnalyticsMetrics {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
}

export interface GoogleAnalyticsTopPages {
  path: string;
  pageViews: number;
  uniquePageViews: number;
}

export interface GoogleAnalyticsTrafficSources {
  source: string;
  sessions: number;
  users: number;
}

class GoogleAnalyticsService {
  private client: BetaAnalyticsDataClient | null = null;
  private propertyId: string = '';
  private isInitialized: boolean = false;
  private initError: string | null = null;

  constructor() {
    // Don't initialize during build time - defer until runtime
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
      console.log('Deferring Google Analytics initialization until runtime');
      return;
    }
    
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;

    try {
      // Check for required environment variables
      const requiredVars = [
        'GOOGLE_ANALYTICS_PROPERTY_ID',
        'GOOGLE_ANALYTICS_PROJECT_ID', 
        'GOOGLE_ANALYTICS_CLIENT_EMAIL',
        'GOOGLE_ANALYTICS_PRIVATE_KEY'
      ];
      
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        this.initError = `Missing Google Analytics environment variables: ${missingVars.join(', ')}`;
        console.error(this.initError);
        this.isInitialized = true;
        return;
      }
      
      // Handle private key formatting - it might be base64 encoded or have escaped newlines
      let privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY || '';
      
      if (!privateKey) {
        this.initError = 'GOOGLE_ANALYTICS_PRIVATE_KEY is not set';
        console.error(this.initError);
        this.isInitialized = true;
        return;
      }
      
      // Handle different private key formats with better error handling
      console.log('Original private key format check:', {
        length: privateKey.length,
        startsWithBegin: privateKey.startsWith('-----BEGIN'),
        hasNewlines: privateKey.includes('\n'),
        hasEscapedNewlines: privateKey.includes('\\n')
      });
      
      // First, replace escaped newlines if they exist (this is the standard Google format)
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      console.log('After escaping newlines:', {
        length: privateKey.length,
        startsWithBegin: privateKey.startsWith('-----BEGIN'),
        hasNewlines: privateKey.includes('\n'),
        first50chars: privateKey.substring(0, 50)
      });
      
      // If after replacing escaped newlines it still doesn't start with -----BEGIN, 
      // then it might be base64 encoded
      if (privateKey && !privateKey.startsWith('-----BEGIN')) {
        console.log('Key does not start with -----BEGIN after newline replacement, attempting base64 decode...');
        try {
          const decoded = Buffer.from(privateKey, 'base64').toString('utf8');
          console.log('Base64 decoded key preview:', {
            length: decoded.length,
            startsWithBegin: decoded.startsWith('-----BEGIN'),
            first50chars: decoded.substring(0, 50),
            last50chars: decoded.length > 50 ? decoded.substring(decoded.length - 50) : ''
          });
          
          if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
            privateKey = decoded;
            console.log('Successfully decoded base64 private key');
          } else {
            console.error('Base64 decoded content preview:', decoded.substring(0, 200));
            throw new Error('Base64 decoded content does not contain valid private key header');
          }
        } catch (base64Error) {
          console.error('Base64 decoding failed:', base64Error);
          throw new Error(`Failed to decode base64 private key: ${base64Error}`);
        }
      } else if (privateKey.startsWith('-----BEGIN')) {
        console.log('Private key is already in correct PEM format after newline replacement');
      }
      
      // Ensure proper formatting
      if (privateKey && !privateKey.includes('\n') && privateKey.includes('-----BEGIN')) {
        console.log('Adding line breaks to single-line private key');
        privateKey = privateKey
          .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
          .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
      }
      
      // Validate the final private key format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
        throw new Error('Private key does not contain required BEGIN/END markers');
      }
      
      console.log('Final private key validation:', {
        hasBegin: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
        hasEnd: privateKey.includes('-----END PRIVATE KEY-----'),
        hasNewlines: privateKey.includes('\n'),
        length: privateKey.length
      });
      
      this.client = new BetaAnalyticsDataClient({
        credentials: {
          client_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
          private_key: privateKey,
        },
        projectId: process.env.GOOGLE_ANALYTICS_PROJECT_ID,
      });
      
      this.propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID || '';
      console.log('Google Analytics client initialized successfully');
      
    } catch (e) {
      this.initError = `Google Analytics initialization failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
      console.error('Error initializing Google Analytics:', e);
    }
    
    this.isInitialized = true;
  }

  private ensureInitialized() {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    if (this.initError) {
      throw new Error(this.initError);
    }
    
    if (!this.client) {
      throw new Error('Google Analytics client is not initialized');
    }
  }

  async getOverviewMetrics(dateRange: { startDate: string; endDate: string } = { startDate: '7daysAgo', endDate: 'today' }): Promise<GoogleAnalyticsMetrics> {
    try {
      this.ensureInitialized();
      const [response] = await this.client!.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'newUsers' },
        ],
      });

      const metrics = response.rows?.[0]?.metricValues || [];
      
      return {
        activeUsers: parseInt(metrics[0]?.value || '0'),
        sessions: parseInt(metrics[1]?.value || '0'),
        pageViews: parseInt(metrics[2]?.value || '0'),
        bounceRate: parseFloat(metrics[3]?.value || '0'),
        avgSessionDuration: parseFloat(metrics[4]?.value || '0'),
        newUsers: parseInt(metrics[5]?.value || '0'),
      };
    } catch (error) {
      console.error('Error fetching GA overview metrics:', error);
      return {
        activeUsers: 0,
        sessions: 0,
        pageViews: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        newUsers: 0,
      };
    }
  }

  async getTopPages(dateRange: { startDate: string; endDate: string } = { startDate: '7daysAgo', endDate: 'today' }, limit: number = 5): Promise<GoogleAnalyticsTopPages[]> {
    try {
      this.ensureInitialized();
      const [response] = await this.client!.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'sessions' },
        ],
        orderBys: [
          {
            metric: { metricName: 'screenPageViews' },
            desc: true,
          },
        ],
        limit,
      });

      return response.rows?.map(row => ({
        path: row.dimensionValues?.[0]?.value || '',
        pageViews: parseInt(row.metricValues?.[0]?.value || '0'),
        uniquePageViews: parseInt(row.metricValues?.[1]?.value || '0'),
      })) || [];
    } catch (error) {
      console.error('Error fetching GA top pages:', error);
      return [];
    }
  }

  async getTrafficSources(dateRange: { startDate: string; endDate: string } = { startDate: '7daysAgo', endDate: 'today' }, limit: number = 5): Promise<GoogleAnalyticsTrafficSources[]> {
    try {
      this.ensureInitialized();
      const [response] = await this.client!.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
        ],
        orderBys: [
          {
            metric: { metricName: 'sessions' },
            desc: true,
          },
        ],
        limit,
      });

      return response.rows?.map(row => ({
        source: row.dimensionValues?.[0]?.value || '',
        sessions: parseInt(row.metricValues?.[0]?.value || '0'),
        users: parseInt(row.metricValues?.[1]?.value || '0'),
      })) || [];
    } catch (error) {
      console.error('Error fetching GA traffic sources:', error);
      return [];
    }
  }

  async getRealtimeMetrics(): Promise<{ activeUsers: number }> {
    try {
      this.ensureInitialized();
      const [response] = await this.client!.runRealtimeReport({
        property: `properties/${this.propertyId}`,
        metrics: [{ name: 'activeUsers' }],
      });

      return {
        activeUsers: parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0'),
      };
    } catch (error) {
      console.error('Error fetching GA realtime metrics:', error);
      return { activeUsers: 0 };
    }
  }
}

export const googleAnalyticsService = new GoogleAnalyticsService();