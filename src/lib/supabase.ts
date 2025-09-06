import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface Lead {
  id: string
  name: string
  company: string
  source: string
  bio_match: number
  followers: number
  website: string
  status: 'new' | 'qualified' | 'unqualified'
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  title: string
  company: string
  value: number
  stage: 'contacted' | 'demo' | 'negotiating' | 'proposal'
  owner: string
  due_date: string
  created_at: string
  updated_at: string
}

export interface ClosedDeal {
  id: string
  client: string
  deal_value: number
  close_date: string
  owner: string
  notes: string
  industry: string
  created_at: string
}

export interface OnboardingClient {
  id: string
  client: string
  assigned_to: string
  start_date: string
  progress: number
  status: 'in-progress' | 'completed' | 'delayed'
  steps: OnboardingStep[]
  created_at: string
  updated_at: string
}

export interface OnboardingStep {
  name: string
  completed: boolean
}

export interface Resource {
  id: string
  user_id: string // AWS Cognito user ID for resource isolation
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
  created_at?: string
  download_url?: string // Added for frontend use
  google_drive_id?: string // Google Drive file ID
  google_modified_time?: string // Last modified time in Google Drive
  last_synced_at?: string // Last sync timestamp
  sync_status?: 'synced' | 'pending' | 'deleted' | 'error'
  version?: number // Version number for tracking updates
}