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
  private client: BetaAnalyticsDataClient;
  private propertyId: string;

  constructor() {
    // Check for required environment variables
    const requiredVars = [
      'GOOGLE_ANALYTICS_PROPERTY_ID',
      'GOOGLE_ANALYTICS_PROJECT_ID', 
      'GOOGLE_ANALYTICS_CLIENT_EMAIL',
      'GOOGLE_ANALYTICS_PRIVATE_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error('Missing Google Analytics environment variables:', missingVars);
    }
    
    // Handle private key formatting - it might be base64 encoded or have escaped newlines
    let privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY || '';
    
    if (!privateKey) {
      console.error('GOOGLE_ANALYTICS_PRIVATE_KEY is not set');
    }
    
    // If the key doesn't start with -----BEGIN, it might be base64 encoded
    if (privateKey && !privateKey.startsWith('-----BEGIN')) {
      try {
        privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
      } catch (e) {
        console.error('Failed to decode base64 private key:', e);
      }
    }
    
    // Replace escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    this.client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
        private_key: privateKey,
      },
      projectId: process.env.GOOGLE_ANALYTICS_PROJECT_ID,
    });
    this.propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID || '';
  }

  async getOverviewMetrics(dateRange: { startDate: string; endDate: string } = { startDate: '7daysAgo', endDate: 'today' }): Promise<GoogleAnalyticsMetrics> {
    try {
      const [response] = await this.client.runReport({
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
      const [response] = await this.client.runReport({
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
      const [response] = await this.client.runReport({
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
      const [response] = await this.client.runRealtimeReport({
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