#!/usr/bin/env tsx

/**
 * DynamoDB Migration Script
 * Migrates data from single table structure to optimized multi-table structure
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { parseISO, format } from 'date-fns';

// Configuration
const config = {
  region: process.env.AWS_REGION || 'ap-southeast-2',
  oldTableName: process.env.OLD_TABLE_NAME || 'expressnext-crm',
  newTables: {
    leads: process.env.LEADS_TABLE || 'CRM-Leads-v2',
    deals: process.env.DEALS_TABLE || 'CRM-Deals-v2', 
    resources: process.env.RESOURCES_TABLE || 'CRM-Resources-v2',
    pipelines: process.env.PIPELINES_TABLE || 'CRM-Pipelines-v2'
  },
  batchSize: 25 // DynamoDB batch write limit
};

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: config.region });
const docClient = DynamoDBDocumentClient.from(client);

// Types for transformed data
interface TransformedLead {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  id: string;
  name: string;
  company: string;
  status: string;
  bio_match: number;
  followers: number;
  source?: string;
  website?: string;
  tags?: string[];
  pipeline_id?: string;
  pipeline_stage?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface TransformedDeal {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  id: string;
  title: string;
  company: string;
  stage: string;
  owner: string;
  value: number;
  due_date?: string;
  pipeline_id: string;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface TransformedResource {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  id: string;
  name: string;
  category: string;
  department: string;
  type: string;
  file_url: string;
  s3_key: string;
  size: number;
  sync_status: string;
  google_drive_id?: string;
  google_modified_time?: string;
  uploaded_by: string;
  description?: string;
  version?: number;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
}

interface TransformedPipeline {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  stages: Array<{
    id: string;
    name: string;
    color: string;
    order: number;
  }>;
  created_at: string;
  updated_at: string;
}

// Utility functions
const formatDateForSK = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    return format(date, 'yyyy-MM');
  } catch {
    return format(new Date(), 'yyyy-MM');
  }
};

const parseJsonSafely = (value: any): any => {
  try {
    // Handle null/undefined/empty values
    if (!value) return null;
    
    // If it's already an array or object, return as-is
    if (typeof value === 'object') return value;
    
    // Convert to string if not already
    const jsonStr = String(value);
    
    if (jsonStr === '[]' || jsonStr === '""' || jsonStr.trim() === '') return null;
    
    // Handle comma-separated values that aren't JSON
    if (jsonStr.includes(',') && !jsonStr.startsWith('[') && !jsonStr.startsWith('{')) {
      return jsonStr.split(',').map(item => item.trim());
    }
    
    // Handle DynamoDB JSON format from export
    if (jsonStr.includes('"S":') || jsonStr.includes('"N":') || jsonStr.includes('"M":')) {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (item.S) return item.S;
          if (item.N) return parseInt(item.N);
          if (item.M) return item.M;
          return item;
        });
      }
      return parsed;
    }
    
    // Try to parse as regular JSON
    return JSON.parse(jsonStr);
  } catch (error) {
    // If all else fails, return the original value if it's meaningful
    const str = String(value);
    if (str && str.trim() !== '') {
      // Handle comma-separated values as array
      if (str.includes(',')) {
        return str.split(',').map(item => item.trim());
      }
      // Return as single-item array for consistency
      return [str.trim()];
    }
    console.warn(`Failed to parse JSON: ${value}`, error);
    return null;
  }
};

// Transform functions for each entity type
const transformLead = (item: any): TransformedLead => {
  const dateSK = formatDateForSK(item.created_at);
  const tags = parseJsonSafely(item.tags) || [];
  
  // Extract custom fields from any unmapped fields
  const customFields: Record<string, any> = {};
  const mappedFields = ['pk', 'sk', 'entity_type', 'id', 'name', 'company', 'status', 'bio_match', 'followers', 'source', 'website', 'tags', 'pipeline_id', 'pipeline_stage', 'created_at', 'updated_at'];
  
  Object.keys(item).forEach(key => {
    if (!mappedFields.includes(key.toLowerCase()) && item[key] && item[key] !== '') {
      customFields[key] = item[key];
    }
  });
  
  return {
    PK: 'LEAD',
    SK: `${dateSK}#${item.id}`,
    GSI1PK: `STATUS#${item.status || 'new'}`,
    GSI1SK: item.created_at,
    GSI2PK: `COMPANY#${item.company || 'unknown'}`,
    GSI2SK: item.id,
    id: item.id,
    name: item.name || '',
    company: item.company || '',
    status: item.status || 'new',
    bio_match: parseInt(item.bio_match) || 0,
    followers: parseInt(item.followers) || 0,
    source: item.source || undefined,
    website: item.website || undefined,
    tags: Array.isArray(tags) ? tags : [],
    pipeline_id: item.pipeline_id || undefined,
    pipeline_stage: item.pipeline_stage || undefined,
    custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
    created_at: item.created_at,
    updated_at: item.updated_at || item.created_at
  };
};

const transformDeal = (item: any): TransformedDeal => {
  const dateSK = formatDateForSK(item.created_at);
  
  // Extract custom fields from any unmapped fields
  const customFields: Record<string, any> = {};
  const mappedFields = ['pk', 'sk', 'entity_type', 'id', 'title', 'company', 'stage', 'owner', 'value', 'due_date', 'pipeline_id', 'created_at', 'updated_at'];
  
  Object.keys(item).forEach(key => {
    if (!mappedFields.includes(key.toLowerCase()) && item[key] && item[key] !== '') {
      customFields[key] = item[key];
    }
  });
  
  return {
    PK: 'DEAL',
    SK: `${dateSK}#${item.id}`,
    GSI1PK: `STAGE#${item.stage || 'contacted'}`,
    GSI1SK: item.created_at,
    GSI2PK: `OWNER#${item.owner || 'unassigned'}`,
    GSI2SK: item.id,
    id: item.id,
    title: item.title || `Deal with ${item.company}`,
    company: item.company || '',
    stage: item.stage || 'contacted',
    owner: item.owner || 'unassigned',
    value: parseInt(item.value) || 0,
    due_date: item.due_date || undefined,
    pipeline_id: item.pipeline_id,
    custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
    created_at: item.created_at,
    updated_at: item.updated_at || item.created_at
  };
};

const transformResource = (item: any): TransformedResource => {
  const dateSK = formatDateForSK(item.created_at);
  
  return {
    PK: 'RESOURCE',
    SK: `${dateSK}#${item.id}`,
    GSI1PK: `CATEGORY#${item.category || 'uncategorized'}`,
    GSI1SK: item.created_at,
    GSI2PK: `SYNC_STATUS#${item.sync_status || 'unknown'}`,
    GSI2SK: item.id,
    id: item.id,
    name: item.name || '',
    category: item.category || 'uncategorized',
    department: item.department || 'general',
    type: item.type || 'document',
    file_url: item.file_url || '',
    s3_key: item.s3_key || '',
    size: parseInt(item.size) || 0,
    sync_status: item.sync_status || 'unknown',
    google_drive_id: item.google_drive_id || undefined,
    google_modified_time: item.google_modified_time || undefined,
    uploaded_by: item.uploaded_by || 'unknown',
    description: item.description || undefined,
    version: parseInt(item.version) || undefined,
    created_at: item.created_at,
    updated_at: item.updated_at || item.created_at,
    last_synced_at: item.last_synced_at || undefined
  };
};

const transformPipeline = (item: any): TransformedPipeline => {
  const dateSK = formatDateForSK(item.created_at);
  
  // Handle stages - could be array of objects or string
  let stages = [];
  if (typeof item.stages === 'string') {
    const parsedStages = parseJsonSafely(item.stages) || [];
    stages = Array.isArray(parsedStages) ? parsedStages : [];
  } else if (Array.isArray(item.stages)) {
    stages = item.stages;
  }
  
  // Transform stages from DynamoDB format to clean format
  const cleanStages = stages.map((stage: any) => {
    if (stage.M) {
      // DynamoDB Map format
      return {
        id: stage.M.id?.S || '',
        name: stage.M.name?.S || '',
        color: stage.M.color?.S || '#3B82F6',
        order: parseInt(stage.M.order?.N || '0')
      };
    } else if (typeof stage === 'object' && stage.id) {
      // Already clean format
      return {
        id: stage.id,
        name: stage.name || '',
        color: stage.color || '#3B82F6',
        order: parseInt(stage.order) || 0
      };
    }
    return stage;
  }).filter(stage => stage && (stage.id || stage.name)); // Filter out invalid stages

  return {
    PK: 'PIPELINE',
    SK: `${dateSK}#${item.id}`,
    GSI1PK: `DEFAULT#${item.is_default === 'true' || item.is_default === true ? 'true' : 'false'}`,
    GSI1SK: item.created_at,
    id: item.id,
    name: item.name || '',
    description: item.description || '',
    is_default: item.is_default === 'true' || item.is_default === true,
    stages: cleanStages,
    created_at: item.created_at,
    updated_at: item.updated_at || item.created_at
  };
};

// Migration functions
const scanOldTable = async (): Promise<any[]> => {
  console.log('📊 Scanning old table for data...');
  const items: any[] = [];
  let lastEvaluatedKey;
  
  do {
    const command = new ScanCommand({
      TableName: config.oldTableName,
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: 100
    });
    
    const response = await docClient.send(command);
    if (response.Items) {
      items.push(...response.Items);
      console.log(`📥 Scanned ${response.Items.length} items (total: ${items.length})`);
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  console.log(`✅ Finished scanning. Found ${items.length} total items`);
  return items;
};

const batchWrite = async (tableName: string, items: any[]): Promise<void> => {
  if (items.length === 0) return;
  
  for (let i = 0; i < items.length; i += config.batchSize) {
    const batch = items.slice(i, i + config.batchSize);
    const putRequests = batch.map(item => ({
      PutRequest: { Item: item }
    }));
    
    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: putRequests
      }
    });
    
    try {
      await docClient.send(command);
      console.log(`✅ Wrote batch to ${tableName}: ${batch.length} items`);
    } catch (error) {
      console.error(`❌ Failed to write batch to ${tableName}:`, error);
      throw error;
    }
  }
};

const migrateTo = async (entityType: string, items: any[]): Promise<void> => {
  console.log(`🔄 Migrating ${items.length} ${entityType} items...`);
  
  let transformedItems: any[] = [];
  let tableName: string;
  
  switch (entityType) {
    case 'LEAD':
      transformedItems = items.map(transformLead);
      tableName = config.newTables.leads;
      break;
    case 'DEAL':
      transformedItems = items.map(transformDeal);
      tableName = config.newTables.deals;
      break;
    case 'RESOURCE':
      transformedItems = items.map(transformResource);
      tableName = config.newTables.resources;
      break;
    case 'PIPELINE':
      transformedItems = items.map(transformPipeline);
      tableName = config.newTables.pipelines;
      break;
    default:
      console.warn(`⚠️ Unknown entity type: ${entityType}`);
      return;
  }
  
  await batchWrite(tableName, transformedItems);
  console.log(`✅ Successfully migrated ${transformedItems.length} ${entityType} items`);
};

// Main migration function
const runMigration = async (): Promise<void> => {
  try {
    console.log('🚀 Starting DynamoDB migration...');
    console.log('📋 Configuration:');
    console.log(`   Source table: ${config.oldTableName}`);
    console.log(`   Target tables:`, config.newTables);
    
    // 1. Scan all data from old table
    const allItems = await scanOldTable();
    
    // 2. Group by entity type
    const itemsByType = allItems.reduce((acc, item) => {
      const entityType = item.entity_type || 'UNKNOWN';
      if (!acc[entityType]) acc[entityType] = [];
      acc[entityType].push(item);
      return acc;
    }, {} as Record<string, any[]>);
    
    console.log('📊 Items by type:');
    Object.entries(itemsByType).forEach(([type, items]) => {
    });
    
    // 3. Migrate each entity type
    for (const [entityType, items] of Object.entries(itemsByType)) {
      if (['LEAD', 'DEAL', 'RESOURCE', 'PIPELINE'].includes(entityType)) {
        await migrateTo(entityType, items as any[]);
      } else {
        console.warn(`⚠️ Skipping unknown entity type: ${entityType}`);
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// CLI execution
if (require.main === module) {
  runMigration();
}

export { runMigration, transformLead, transformDeal, transformResource, transformPipeline };