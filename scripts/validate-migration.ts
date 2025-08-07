#!/usr/bin/env tsx

/**
 * Migration Validation Script
 * Validates that data was migrated correctly from old to new tables
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const config = {
  region: process.env.AWS_REGION || 'ap-southeast-2',
  oldTableName: process.env.OLD_TABLE_NAME || 'expressnext-crm',
  newTables: {
    leads: process.env.LEADS_TABLE || 'CRM-Leads-v2',
    deals: process.env.DEALS_TABLE || 'CRM-Deals-v2',
    resources: process.env.RESOURCES_TABLE || 'CRM-Resources-v2',
    pipelines: process.env.PIPELINES_TABLE || 'CRM-Pipelines-v2'
  }
};

const client = new DynamoDBClient({ region: config.region });
const docClient = DynamoDBDocumentClient.from(client);

interface ValidationResult {
  entityType: string;
  originalCount: number;
  migratedCount: number;
  missingItems: string[];
  errors: string[];
  success: boolean;
}

interface ValidationSummary {
  totalOriginal: number;
  totalMigrated: number;
  totalMissing: number;
  totalErrors: number;
  results: ValidationResult[];
  overallSuccess: boolean;
}

const scanTable = async (tableName: string, filterExpression?: string, filterValues?: any): Promise<any[]> => {
  const items: any[] = [];
  let lastEvaluatedKey;

  do {
    const params: any = {
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: 100
    };

    if (filterExpression && filterValues) {
      params.FilterExpression = filterExpression;
      params.ExpressionAttributeValues = filterValues;
    }

    const command = new ScanCommand(params);
    const response = await docClient.send(command);
    
    if (response.Items) {
      items.push(...response.Items);
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
};

const getNewTableName = (entityType: string): string => {
  switch (entityType) {
    case 'LEAD':
      return config.newTables.leads;
    case 'DEAL':
      return config.newTables.deals;
    case 'RESOURCE':
      return config.newTables.resources;
    case 'PIPELINE':
      return config.newTables.pipelines;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
};

const validateEntityType = async (entityType: string, originalItems: any[]): Promise<ValidationResult> => {
  console.log(`🔍 Validating ${entityType} migration...`);
  
  const result: ValidationResult = {
    entityType,
    originalCount: originalItems.length,
    migratedCount: 0,
    missingItems: [],
    errors: [],
    success: false
  };

  try {
    // Get new table name
    const newTableName = getNewTableName(entityType);
    
    // Scan new table for this entity type
    const migratedItems = await scanTable(newTableName);
    result.migratedCount = migratedItems.length;

    // Check each original item exists in new table
    for (const originalItem of originalItems) {
      const itemId = originalItem.id;
      
      try {
        // Find matching item in migrated data
        const migratedItem = migratedItems.find(item => item.id === itemId);
        
        if (!migratedItem) {
          result.missingItems.push(itemId);
          continue;
        }

        // Validate key fields match
        const validationErrors = validateItemFields(originalItem, migratedItem, entityType);
        if (validationErrors.length > 0) {
          result.errors.push(`${itemId}: ${validationErrors.join(', ')}`);
        }

      } catch (error) {
        result.errors.push(`${itemId}: Failed to validate - ${error}`);
      }
    }

    result.success = result.missingItems.length === 0 && result.errors.length === 0;
    
    console.log(`✅ ${entityType} validation completed:`);
    console.log(`   Original: ${result.originalCount}, Migrated: ${result.migratedCount}`);
    console.log(`   Missing: ${result.missingItems.length}, Errors: ${result.errors.length}`);

  } catch (error) {
    result.errors.push(`Failed to validate ${entityType}: ${error}`);
    console.error(`❌ ${entityType} validation failed:`, error);
  }

  return result;
};

const validateItemFields = (original: any, migrated: any, entityType: string): string[] => {
  const errors: string[] = [];

  // Common field validations
  if (original.id !== migrated.id) {
    errors.push(`ID mismatch: ${original.id} != ${migrated.id}`);
  }

  if (original.created_at !== migrated.created_at) {
    errors.push(`created_at mismatch`);
  }

  // Entity-specific validations
  switch (entityType) {
    case 'LEAD':
      if (original.name !== migrated.name) {
        errors.push('name mismatch');
      }
      if (original.company !== migrated.company) {
        errors.push('company mismatch');
      }
      if (original.status !== (migrated.status || 'new')) {
        errors.push('status mismatch');
      }
      break;

    case 'DEAL':
      if (original.title !== migrated.title && !migrated.title?.includes(original.company)) {
        errors.push('title mismatch');
      }
      if (original.value && parseInt(original.value) !== migrated.value) {
        errors.push('value mismatch');
      }
      if (original.stage !== migrated.stage) {
        errors.push('stage mismatch');
      }
      break;

    case 'RESOURCE':
      if (original.name !== migrated.name) {
        errors.push('name mismatch');
      }
      if (original.file_url !== migrated.file_url) {
        errors.push('file_url mismatch');
      }
      if (original.s3_key !== migrated.s3_key) {
        errors.push('s3_key mismatch');
      }
      break;

    case 'PIPELINE':
      if (original.name !== migrated.name) {
        errors.push('name mismatch');
      }
      // Handle boolean comparison for is_default
      const originalDefault = original.is_default === 'true' || original.is_default === true;
      const migratedDefault = migrated.is_default === true;
      if (originalDefault !== migratedDefault) {
        errors.push(`is_default mismatch: ${originalDefault} != ${migratedDefault}`);
      }
      break;
  }

  return errors;
};

const validateDynamoDBStructure = async (tableName: string, entityType: string): Promise<string[]> => {
  const errors: string[] = [];
  
  try {
    // Sample a few items to validate structure
    const items = await scanTable(tableName);
    const sampleSize = Math.min(5, items.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const item = items[i];
      
      // Check required DynamoDB fields
      if (!item.PK || typeof item.PK !== 'string') {
        errors.push(`Item ${item.id}: Missing or invalid PK`);
      }
      
      if (!item.SK || typeof item.SK !== 'string') {
        errors.push(`Item ${item.id}: Missing or invalid SK`);
      }
      
      if (!item.GSI1PK || typeof item.GSI1PK !== 'string') {
        errors.push(`Item ${item.id}: Missing or invalid GSI1PK`);
      }
      
      if (!item.GSI1SK || typeof item.GSI1SK !== 'string') {
        errors.push(`Item ${item.id}: Missing or invalid GSI1SK`);
      }

      // Validate PK/SK format
      if (item.PK !== entityType.toUpperCase()) {
        errors.push(`Item ${item.id}: PK should be ${entityType.toUpperCase()}, got ${item.PK}`);
      }

      if (!item.SK.includes('#')) {
        errors.push(`Item ${item.id}: SK should contain date#id format, got ${item.SK}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to validate table structure: ${error}`);
  }

  return errors;
};

const runValidation = async (): Promise<ValidationSummary> => {
  console.log('🔍 Starting migration validation...');
  console.log('📋 Configuration:');
  console.log(`   Source table: ${config.oldTableName}`);
  console.log(`   Target tables:`, config.newTables);

  const summary: ValidationSummary = {
    totalOriginal: 0,
    totalMigrated: 0,
    totalMissing: 0,
    totalErrors: 0,
    results: [],
    overallSuccess: false
  };

  try {
    // 1. Get all original data grouped by entity type
    console.log('📊 Scanning original table...');
    const originalItems = await scanTable(config.oldTableName);
    
    const itemsByType = originalItems.reduce((acc, item) => {
      const entityType = item.entity_type || 'UNKNOWN';
      if (!acc[entityType]) acc[entityType] = [];
      acc[entityType].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('📊 Original data summary:');
    Object.entries(itemsByType).forEach(([type, items]) => {
    });

    // 2. Validate each entity type
    for (const entityType of ['LEAD', 'DEAL', 'RESOURCE', 'PIPELINE']) {
      if (itemsByType[entityType]) {
        const result = await validateEntityType(entityType, itemsByType[entityType]);
        summary.results.push(result);
        summary.totalMigrated += result.migratedCount;
        summary.totalMissing += result.missingItems.length;
        summary.totalErrors += result.errors.length;

        // Validate table structure
        const tableName = getNewTableName(entityType);
        const structureErrors = await validateDynamoDBStructure(tableName, entityType);
        if (structureErrors.length > 0) {
          result.errors.push(...structureErrors);
          summary.totalErrors += structureErrors.length;
        }
      }
    }

    // 3. Generate summary
    summary.overallSuccess = summary.totalMissing === 0 && summary.totalErrors === 0;

    console.log('\n📊 Validation Summary:');
    console.log('┌─────────────────┬──────────┬───────────┬─────────┬────────┬─────────┐');
    console.log('│ Entity Type     │ Original │ Migrated  │ Missing │ Errors │ Status  │');
    console.log('├─────────────────┼──────────┼───────────┼─────────┼────────┼─────────┤');
    
    summary.results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`│ ${result.entityType.padEnd(15)} │ ${result.originalCount.toString().padStart(8)} │ ${result.migratedCount.toString().padStart(9)} │ ${result.missingItems.length.toString().padStart(7)} │ ${result.errors.length.toString().padStart(6)} │ ${status} │`);
    });
    
    console.log('└─────────────────┴──────────┴───────────┴─────────┴────────┴─────────┘');
    
    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total Original Items: ${summary.totalOriginal}`);
    console.log(`   Total Migrated Items: ${summary.totalMigrated}`);
    console.log(`   Total Missing Items: ${summary.totalMissing}`);
    console.log(`   Total Errors: ${summary.totalErrors}`);
    console.log(`   Migration Success: ${summary.overallSuccess ? '✅ PASS' : '❌ FAIL'}`);

    // 4. Report detailed errors if any
    if (!summary.overallSuccess) {
      console.log('\n❌ Detailed Error Report:');
      summary.results.forEach(result => {
        if (!result.success) {
          console.log(`\n${result.entityType} Issues:`);
          
          if (result.missingItems.length > 0) {
            console.log(`  Missing Items (${result.missingItems.length}):`);
            result.missingItems.slice(0, 10).forEach(id => console.log(`    • ${id}`));
            if (result.missingItems.length > 10) {
              console.log(`    • ... and ${result.missingItems.length - 10} more`);
            }
          }
          
          if (result.errors.length > 0) {
            console.log(`  Validation Errors (${result.errors.length}):`);
            result.errors.slice(0, 10).forEach(error => console.log(`    • ${error}`));
            if (result.errors.length > 10) {
              console.log(`    • ... and ${result.errors.length - 10} more`);
            }
          }
        }
      });
    } else {
      console.log('\n🎉 All validations passed! Migration was successful.');
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
    summary.overallSuccess = false;
  }

  return summary;
};

// CLI execution
if (require.main === module) {
  runValidation()
    .then(summary => {
      if (!summary.overallSuccess) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Validation script failed:', error);
      process.exit(1);
    });
}

export { runValidation, validateEntityType, validateItemFields };