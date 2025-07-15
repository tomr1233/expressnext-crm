import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

let _client: DynamoDBClient | null = null
let _dynamoDb: DynamoDBDocumentClient | null = null

function createDynamoDBClient() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not found in environment variables')
  }

  return new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })
}

export const getDynamoDbClient = () => {
  if (!_client) {
    _client = createDynamoDBClient()
    _dynamoDb = DynamoDBDocumentClient.from(_client)
  }
  return _dynamoDb!
}

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'expressnext-crm'

// DynamoDB Types for our CRM system
export interface Lead {
  pk: string // LEAD#${leadId}
  sk: string // METADATA
  id: string
  name: string
  company: string
  source: string
  bio_match: number
  followers: number
  website: string
  status: 'new' | 'qualified' | 'unqualified'
  tags: string[]
  pipeline_id?: string
  pipeline_stage?: string
  stage_changed_at?: string
  created_at: string
  updated_at: string
  entity_type: 'LEAD'
}

export interface Pipeline {
  pk: string // PIPELINE#${pipelineId}
  sk: string // METADATA
  id: string
  name: string
  description?: string
  stages: PipelineStage[]
  is_default: boolean
  created_at: string
  updated_at: string
  entity_type: 'PIPELINE'
}

export interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
  description?: string
}

export interface Deal {
  pk: string // DEAL#${dealId}
  sk: string // METADATA
  id: string
  title: string
  company: string
  value: number
  stage: string
  pipeline_id: string
  owner: string
  due_date: string
  created_at: string
  updated_at: string
  entity_type: 'DEAL'
}

export interface Resource {
  pk: string // RESOURCE#${resourceId}
  sk: string // METADATA
  id: string
  name: string
  type: 'document' | 'video' | 'image' | 'other'
  category: string
  department: string
  description: string
  s3_key: string
  file_url: string
  size: string
  tags: string[]
  upload_date: string
  uploaded_by: string
  created_at: string
  updated_at: string
  entity_type: 'RESOURCE'
  // Google Drive sync fields
  google_drive_id?: string
  sync_status?: 'synced' | 'pending' | 'error' | 'deleted'
  last_synced_at?: string
  google_modified_time?: string
  version?: number
}

// Key generation utilities
export const generateLeadKey = (leadId: string) => ({
  pk: `LEAD#${leadId}`,
  sk: 'METADATA'
})

export const generatePipelineKey = (pipelineId: string) => ({
  pk: `PIPELINE#${pipelineId}`,
  sk: 'METADATA'
})

export const generateDealKey = (dealId: string) => ({
  pk: `DEAL#${dealId}`,
  sk: 'METADATA'
})

export const generateResourceKey = (resourceId: string) => ({
  pk: `RESOURCE#${resourceId}`,
  sk: 'METADATA'
})