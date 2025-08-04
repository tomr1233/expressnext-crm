import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { 
  Lead as OldLead, 
  Deal as OldDeal, 
  Resource as OldResource,
  TABLE_NAME as OLD_TABLE_NAME 
} from '../lib/dynamodb'
import { 
  Lead as NewLead,
  Deal as NewDeal, 
  Resource as NewResource,
  User,
  TABLE_NAMES,
  CustomField
} from '../lib/dynamodb-separate'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
})

const dynamoDb = DynamoDBDocumentClient.from(client)

interface MigrationStats {
  leads: { migrated: number; failed: number }
  deals: { migrated: number; failed: number }
  resources: { migrated: number; failed: number }
  users: { migrated: number; failed: number }
}

export async function migrateData(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    leads: { migrated: 0, failed: 0 },
    deals: { migrated: 0, failed: 0 },
    resources: { migrated: 0, failed: 0 },
    users: { migrated: 0, failed: 0 }
  }

  console.log('Starting migration from single table to separate tables...')

  // Step 1: Scan the old table for all items
  console.log('Scanning old table for all items...')
  const scanResult = await dynamoDb.send(new ScanCommand({
    TableName: OLD_TABLE_NAME
  }))

  const items = scanResult.Items || []
  console.log(`Found ${items.length} items in old table`)

  // Step 2: Create default admin user (since users table is new)
  console.log('Creating default admin user...')
  try {
    const defaultUser: User = {
      user_id: 'admin-001',
      email: 'admin@company.com',
      name: 'System Administrator',
      role: 'admin',
      department: 'IT',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await dynamoDb.send(new PutCommand({
      TableName: TABLE_NAMES.USERS,
      Item: defaultUser
    }))
    stats.users.migrated++
    console.log('Default admin user created')
  } catch (error) {
    console.error('Failed to create default admin user:', error)
    stats.users.failed++
  }

  // Step 3: Migrate each item based on entity_type
  for (const item of items) {
    try {
      switch (item.entity_type) {
        case 'LEAD':
          await migrateLead(item as OldLead, stats)
          break
        case 'DEAL':
          await migrateDeal(item as OldDeal, stats)
          break
        case 'RESOURCE':
          await migrateResource(item as OldResource, stats)
          break
        case 'PIPELINE':
          // Skip pipelines for now - they can be recreated manually
          console.log(`Skipping pipeline: ${item.id}`)
          break
        default:
          console.log(`Unknown entity type: ${item.entity_type}`)
      }
    } catch (error) {
      console.error(`Failed to migrate item ${item.id}:`, error)
    }
  }

  console.log('Migration completed!')
  console.log('Migration Stats:')
  console.log(`- Leads: ${stats.leads.migrated} migrated, ${stats.leads.failed} failed`)
  console.log(`- Deals: ${stats.deals.migrated} migrated, ${stats.deals.failed} failed`)
  console.log(`- Resources: ${stats.resources.migrated} migrated, ${stats.resources.failed} failed`)
  console.log(`- Users: ${stats.users.migrated} migrated, ${stats.users.failed} failed`)

  return stats
}

async function migrateLead(oldLead: OldLead, stats: MigrationStats): Promise<void> {
  try {
    const newLead: NewLead = {
      lead_id: oldLead.id,
      created_at: oldLead.created_at,
      name: oldLead.name,
      company: oldLead.company,
      source: oldLead.source,
      bio_match: oldLead.bio_match,
      followers: oldLead.followers,
      website: oldLead.website,
      status: oldLead.status,
      tags: oldLead.tags,
      pipeline_id: oldLead.pipeline_id,
      pipeline_stage: oldLead.pipeline_stage,
      stage_changed_at: oldLead.stage_changed_at,
      updated_at: oldLead.updated_at
    }

    await dynamoDb.send(new PutCommand({
      TableName: TABLE_NAMES.LEADS,
      Item: newLead
    }))

    stats.leads.migrated++
    console.log(`Migrated lead: ${oldLead.id}`)
  } catch (error) {
    console.error(`Failed to migrate lead ${oldLead.id}:`, error)
    stats.leads.failed++
  }
}

async function migrateDeal(oldDeal: OldDeal, stats: MigrationStats): Promise<void> {
  try {
    // Convert old deal to new deal format with custom fields
    const customFields: CustomField[] = []
    
    // If there are any additional fields in the old deal that aren't in the base schema,
    // convert them to custom fields
    const baseFields = ['id', 'title', 'company', 'value', 'stage', 'pipeline_id', 'owner', 'due_date', 'created_at', 'updated_at', 'pk', 'sk', 'entity_type']
    
    for (const [key, value] of Object.entries(oldDeal)) {
      if (!baseFields.includes(key) && value !== undefined && value !== null) {
        let fieldType: 'text' | 'number' | 'boolean' | 'date' = 'text'
        
        if (typeof value === 'number') {
          fieldType = 'number'
        } else if (typeof value === 'boolean') {
          fieldType = 'boolean'
        } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
          fieldType = 'date'
        }
        
        customFields.push({
          key,
          value: value as string | number | boolean,
          type: fieldType
        })
      }
    }

    const newDeal: NewDeal = {
      deal_id: oldDeal.id,
      pipeline_id: oldDeal.pipeline_id,
      title: oldDeal.title,
      company: oldDeal.company,
      value: oldDeal.value,
      stage: oldDeal.stage,
      owner: oldDeal.owner,
      due_date: oldDeal.due_date,
      created_at: oldDeal.created_at,
      updated_at: oldDeal.updated_at,
      custom_fields: customFields
    }

    await dynamoDb.send(new PutCommand({
      TableName: TABLE_NAMES.DEALS,
      Item: newDeal
    }))

    stats.deals.migrated++
    console.log(`Migrated deal: ${oldDeal.id} with ${customFields.length} custom fields`)
  } catch (error) {
    console.error(`Failed to migrate deal ${oldDeal.id}:`, error)
    stats.deals.failed++
  }
}

async function migrateResource(oldResource: OldResource, stats: MigrationStats): Promise<void> {
  try {
    const newResource: NewResource = {
      resource_id: oldResource.id,
      category: oldResource.category,
      name: oldResource.name,
      type: oldResource.type,
      department: oldResource.department,
      description: oldResource.description,
      s3_key: oldResource.s3_key,
      file_url: oldResource.file_url,
      size: oldResource.size,
      tags: oldResource.tags,
      upload_date: oldResource.upload_date,
      uploaded_by: oldResource.uploaded_by,
      created_at: oldResource.created_at,
      updated_at: oldResource.updated_at,
      google_drive_id: oldResource.google_drive_id,
      sync_status: oldResource.sync_status,
      last_synced_at: oldResource.last_synced_at,
      google_modified_time: oldResource.google_modified_time,
      version: oldResource.version
    }

    await dynamoDb.send(new PutCommand({
      TableName: TABLE_NAMES.RESOURCES,
      Item: newResource
    }))

    stats.resources.migrated++
    console.log(`Migrated resource: ${oldResource.id}`)
  } catch (error) {
    console.error(`Failed to migrate resource ${oldResource.id}:`, error)
    stats.resources.failed++
  }
}

// Backup function to create a backup of the old table before migration
export async function createBackup(): Promise<void> {
  console.log('Creating backup of old table...')
  
  try {
    const scanResult = await dynamoDb.send(new ScanCommand({
      TableName: OLD_TABLE_NAME
    }))

    const backupData = {
      timestamp: new Date().toISOString(),
      table_name: OLD_TABLE_NAME,
      item_count: scanResult.Items?.length || 0,
      items: scanResult.Items || []
    }

    // Save backup to file
    const fs = await import('fs')
    const backupFileName = `backup-${OLD_TABLE_NAME}-${Date.now()}.json`
    fs.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2))
    
    console.log(`Backup created: ${backupFileName}`)
  } catch (error) {
    console.error('Failed to create backup:', error)
    throw error
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  async function runMigration() {
    try {
      console.log('Do you want to create a backup first? (recommended)')
      await createBackup()
      
      console.log('\nStarting migration...')
      await migrateData()
      
      console.log('\nMigration completed successfully!')
      console.log('Please verify the data in the new tables before removing the old table.')
      
      process.exit(0)
    } catch (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }
  }
  
  runMigration()
}