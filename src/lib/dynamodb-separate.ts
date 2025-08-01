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

const BASE_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'expressnext-crm'

export const TABLE_NAMES = {
  USERS: `${BASE_TABLE_NAME}-users`,
  LEADS: `${BASE_TABLE_NAME}-leads`,
  DEALS: `${BASE_TABLE_NAME}-deals`,
  RESOURCES: `${BASE_TABLE_NAME}-resources`
}

// Type definitions for separate tables

export interface User {
  user_id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'user' | 'viewer'
  department?: string
  created_at: string
  updated_at: string
  last_login?: string
  status: 'active' | 'inactive' | 'suspended'
}

export interface Lead {
  lead_id: string
  created_at: string // Sort key
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
  updated_at: string
}

export interface CustomField {
  key: string
  value: string | number | boolean
  type: 'text' | 'number' | 'boolean' | 'date'
}

export interface Deal {
  deal_id: string
  pipeline_id: string // Sort key
  title: string
  company: string
  value: number
  stage: string
  owner: string
  due_date: string
  created_at: string
  updated_at: string
  custom_fields: CustomField[] // Added custom fields array
}

export interface Resource {
  resource_id: string
  category: string // Sort key
  name: string
  type: 'document' | 'video' | 'image' | 'other'
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
  // Google Drive sync fields
  google_drive_id?: string
  sync_status?: 'synced' | 'pending' | 'error' | 'deleted'
  last_synced_at?: string
  google_modified_time?: string
  version?: number
}

export interface Pipeline {
  pipeline_id: string
  name: string
  description?: string
  stages: PipelineStage[]
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
  description?: string
}

// Key generation utilities for separate tables
export const generateUserKey = (userId: string) => ({
  user_id: userId
})

export const generateLeadKey = (leadId: string, createdAt: string) => ({
  lead_id: leadId,
  created_at: createdAt
})

export const generateDealKey = (dealId: string, pipelineId: string) => ({
  deal_id: dealId,
  pipeline_id: pipelineId
})

export const generateResourceKey = (resourceId: string, category: string) => ({
  resource_id: resourceId,
  category: category
})