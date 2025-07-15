import dotenv from 'dotenv'
import path from 'path'
import { LeadOperations, PipelineOperations, DealOperations } from '../lib/dynamodb-operations'
import { createDynamoDBTable } from './create-dynamodb-table'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

export async function setupDynamoDBData() {
  try {
    console.log('Setting up DynamoDB...')
    
    // First, ensure the table exists
    await createDynamoDBTable()
    
    console.log('Setting up DynamoDB data...')

    // Create a default pipeline
    const defaultPipeline = await PipelineOperations.createPipeline({
      name: 'Sales Pipeline',
      description: 'Default sales pipeline for CRM',
      is_default: true,
      stages: [
        { id: 'contacted', name: 'Contacted', order: 1, color: '#3B82F6' },
        { id: 'demo', name: 'Demo Scheduled', order: 2, color: '#F59E0B' },
        { id: 'negotiating', name: 'Negotiating', order: 3, color: '#F97316' },
        { id: 'proposal', name: 'Proposal Sent', order: 4, color: '#10B981' },
      ]
    })

    console.log('Created default pipeline:', defaultPipeline.id)

    // Create sample leads
    const sampleLeads = [
      {
        name: 'Sarah Johnson',
        company: 'TechStart Inc',
        source: 'LinkedIn',
        bio_match: 85,
        followers: 1250,
        website: 'https://techstart.com',
        status: 'qualified' as const,
        tags: ['AI', 'SaaS'],
        pipeline_id: defaultPipeline.id,
        pipeline_stage: 'contacted'
      },
      {
        name: 'Michael Chen',
        company: 'Digital Solutions',
        source: 'Twitter',
        bio_match: 72,
        followers: 890,
        website: 'https://digitalsol.com',
        status: 'unqualified' as const,
        tags: ['Marketing', 'Automation']
      },
      {
        name: 'Emily Rodriguez',
        company: 'Growth Labs',
        source: 'Cold Email',
        bio_match: 91,
        followers: 2100,
        website: 'https://growthlabs.io',
        status: 'new' as const,
        tags: ['Growth', 'AI', 'B2B']
      }
    ]

    for (const leadData of sampleLeads) {
      const lead = await LeadOperations.createLead(leadData)
      console.log('Created lead:', lead.name)
    }

    // Create sample deals
    const sampleDeals = [
      {
        title: 'TechStart AI Integration',
        company: 'TechStart Inc',
        value: 25000,
        stage: 'demo',
        pipeline_id: defaultPipeline.id,
        owner: 'Sarah Smith',
        due_date: '2024-12-20'
      },
      {
        title: 'Growth Labs CRM Setup',
        company: 'Growth Labs',
        value: 35000,
        stage: 'negotiating',
        pipeline_id: defaultPipeline.id,
        owner: 'Mike Johnson',
        due_date: '2024-12-25'
      },
      {
        title: 'Digital Solutions Automation',
        company: 'Digital Solutions',
        value: 20000,
        stage: 'proposal',
        pipeline_id: defaultPipeline.id,
        owner: 'Emily Davis',
        due_date: '2024-12-30'
      }
    ]

    for (const dealData of sampleDeals) {
      const deal = await DealOperations.createDeal(dealData)
      console.log('Created deal:', deal.title)
    }

    console.log('DynamoDB setup complete!')
  } catch (error) {
    console.error('Error setting up DynamoDB:', error)
    throw error
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupDynamoDBData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}