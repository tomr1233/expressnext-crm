import { NextRequest, NextResponse } from 'next/server'
import { LeadOperations, DealOperations, ResourceOperations, PipelineOperations } from '@/lib/dynamodb-operations'
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware'

interface ActivityItem {
  id: string;
  type: 'lead_created' | 'deal_created' | 'deal_updated' | 'deal_closed' | 'resource_created' | 'pipeline_created';
  user: string;
  action: string;
  target: string;
  timestamp: string;
  entity_id: string;
}

async function getRecentActivity(_request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const [leads, deals, resources, pipelines] = await Promise.all([
      LeadOperations.getAllLeads(),
      DealOperations.getAllDeals(),
      ResourceOperations.getAllResources(),
      PipelineOperations.getAllPipelines(),
    ]);

    const activities: ActivityItem[] = [];

    leads.forEach(lead => {
      activities.push({
        id: `lead_${lead.id}`,
        type: 'lead_created',
        user: user.email || 'System',
        action: 'created new lead',
        target: lead.company || lead.name || 'Unknown Lead',
        timestamp: lead.created_at,
        entity_id: lead.id,
      });
    });

    deals.forEach(deal => {
      activities.push({
        id: `deal_${deal.id}`,
        type: 'deal_created',
        user: user.email || 'System', 
        action: 'created new deal',
        target: deal.title || deal.company || 'Unknown Deal',
        timestamp: deal.created_at,
        entity_id: deal.id,
      });

      if (deal.stage === 'closed') {
        activities.push({
          id: `deal_closed_${deal.id}`,
          type: 'deal_closed',
          user: user.email || 'System',
          action: 'closed deal with',
          target: deal.title || deal.company || 'Unknown Deal',
          timestamp: deal.updated_at,
          entity_id: deal.id,
        });
      }

      if (deal.updated_at !== deal.created_at) {
        activities.push({
          id: `deal_updated_${deal.id}`,
          type: 'deal_updated', 
          user: user.email || 'System',
          action: 'updated deal',
          target: deal.title || deal.company || 'Unknown Deal',
          timestamp: deal.updated_at,
          entity_id: deal.id,
        });
      }
    });

    resources.forEach(resource => {
      activities.push({
        id: `resource_${resource.id}`,
        type: 'resource_created',
        user: user.email || 'System',
        action: 'uploaded new resource',
        target: resource.name || 'Unknown File',
        timestamp: resource.created_at,
        entity_id: resource.id,
      });
    });

    pipelines.forEach(pipeline => {
      activities.push({
        id: `pipeline_${pipeline.id}`,
        type: 'pipeline_created',
        user: user.email || 'System',
        action: 'created new pipeline',
        target: pipeline.name || 'Unknown Pipeline', 
        timestamp: pipeline.created_at,
        entity_id: pipeline.id,
      });
    });

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const recentActivities = activities.slice(0, 10);

    return NextResponse.json(recentActivities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return NextResponse.json({ error: 'Failed to fetch recent activity' }, { status: 500 });
  }
}

export const GET = withAuth(getRecentActivity);