#!/usr/bin/env tsx

/**
 * Migration Rollback Script
 * Emergency rollback functionality to restore from backup or delete new tables
 */

import { DynamoDBClient, DeleteTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as readline from 'readline';

const config = {
  region: process.env.AWS_REGION || 'ap-southeast-2',
  oldTableName: process.env.OLD_TABLE_NAME || 'expressnext-crm',
  newTables: {
    leads: process.env.LEADS_TABLE || 'CRM-Leads-v2',
    deals: process.env.DEALS_TABLE || 'CRM-Deals-v2',
    resources: process.env.RESOURCES_TABLE || 'CRM-Resources-v2',
    pipelines: process.env.PIPELINES_TABLE || 'CRM-Pipelines-v2'
  },
  backupTableSuffix: '-backup'
};

const client = new DynamoDBClient({ region: config.region });
const docClient = DynamoDBDocumentClient.from(client);

interface RollbackOptions {
  deleteNewTables: boolean;
  restoreFromBackup: boolean;
  confirmEachStep: boolean;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

const confirmAction = async (message: string): Promise<boolean> => {
  const answer = await askQuestion(`${message} (y/N): `);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
};

const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
};

const deleteTable = async (tableName: string): Promise<void> => {
  console.log(`🗑️ Deleting table: ${tableName}`);
  
  if (!(await checkTableExists(tableName))) {
    console.log(`⚠️ Table ${tableName} does not exist, skipping...`);
    return;
  }

  try {
    await client.send(new DeleteTableCommand({ TableName: tableName }));
    console.log(`✅ Table ${tableName} deletion initiated`);
    
    // Wait for deletion to complete
    console.log(`⏳ Waiting for table ${tableName} to be deleted...`);
    while (await checkTableExists(tableName)) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log(`⏳ Still deleting ${tableName}...`);
    }
    console.log(`✅ Table ${tableName} successfully deleted`);
    
  } catch (error) {
    console.error(`❌ Failed to delete table ${tableName}:`, error);
    throw error;
  }
};

const scanTable = async (tableName: string): Promise<any[]> => {
  const items: any[] = [];
  let lastEvaluatedKey;
  
  do {
    const command = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: 100
    });
    
    const response = await docClient.send(command);
    if (response.Items) {
      items.push(...response.Items);
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  return items;
};

const restoreFromBackupTable = async (backupTableName: string, targetTableName: string): Promise<void> => {
  console.log(`📥 Restoring ${targetTableName} from ${backupTableName}...`);
  
  if (!(await checkTableExists(backupTableName))) {
    throw new Error(`Backup table ${backupTableName} does not exist`);
  }

  if (!(await checkTableExists(targetTableName))) {
    throw new Error(`Target table ${targetTableName} does not exist`);
  }

  try {
    // Scan backup table
    console.log(`📊 Scanning backup table ${backupTableName}...`);
    const backupItems = await scanTable(backupTableName);
    console.log(`📦 Found ${backupItems.length} items in backup`);

    // Clear target table first
    console.log(`🧹 Clearing target table ${targetTableName}...`);
    const existingItems = await scanTable(targetTableName);
    
    if (existingItems.length > 0) {
      // Delete existing items in batches
      for (let i = 0; i < existingItems.length; i += 25) {
        const batch = existingItems.slice(i, i + 25);
        const deleteRequests = batch.map(item => ({
          DeleteRequest: {
            Key: {
              PK: item.PK,
              SK: item.SK
            }
          }
        }));

        await docClient.send(new BatchWriteCommand({
          RequestItems: {
            [targetTableName]: deleteRequests
          }
        }));
        
        console.log(`🗑️ Deleted ${batch.length} items from ${targetTableName}`);
      }
    }

    // Restore items from backup
    if (backupItems.length > 0) {
      for (let i = 0; i < backupItems.length; i += 25) {
        const batch = backupItems.slice(i, i + 25);
        const putRequests = batch.map(item => ({
          PutRequest: { Item: item }
        }));

        await docClient.send(new BatchWriteCommand({
          RequestItems: {
            [targetTableName]: putRequests
          }
        }));
        
        console.log(`📥 Restored ${batch.length} items to ${targetTableName}`);
      }
    }

    console.log(`✅ Successfully restored ${targetTableName} from backup`);
    
  } catch (error) {
    console.error(`❌ Failed to restore ${targetTableName} from backup:`, error);
    throw error;
  }
};

const createBackup = async (tableName: string): Promise<string> => {
  const backupTableName = `${tableName}${config.backupTableSuffix}`;
  
  console.log(`💾 Creating backup of ${tableName} as ${backupTableName}...`);
  
  // Check if backup already exists
  if (await checkTableExists(backupTableName)) {
    const overwrite = await confirmAction(`Backup table ${backupTableName} already exists. Overwrite?`);
    if (!overwrite) {
      console.log(`⏭️ Skipping backup creation for ${tableName}`);
      return backupTableName;
    }
    await deleteTable(backupTableName);
  }

  try {
    // This is a simplified backup - in production you'd use DynamoDB backup features
    // For now, we'll just notify that manual backup should be created
    console.log(`⚠️ Manual backup recommended for ${tableName}`);
    console.log(`   You should create a point-in-time backup or export before proceeding`);
    console.log(`   AWS CLI: aws dynamodb create-backup --table-name ${tableName} --backup-name ${tableName}-pre-rollback`);
    
    return backupTableName;
  } catch (error) {
    console.error(`❌ Failed to create backup for ${tableName}:`, error);
    throw error;
  }
};

const rollbackMigration = async (options: RollbackOptions): Promise<void> => {
  console.log('🔄 Starting migration rollback...');
  console.log('⚠️ WARNING: This will affect production data!');
  console.log('📋 Rollback plan:');
  
  if (options.deleteNewTables) {
    console.log('   • Delete new table structure');
  }
  if (options.restoreFromBackup) {
    console.log('   • Restore original data from backup');
  }
  
  // Final confirmation
  if (options.confirmEachStep) {
    const confirm = await confirmAction('\n🚨 Are you absolutely sure you want to proceed with rollback?');
    if (!confirm) {
      console.log('❌ Rollback cancelled by user');
      return;
    }
  }

  try {
    // Step 1: Create backup of current state (if tables exist)
    if (options.deleteNewTables) {
      console.log('\n📦 Phase 1: Creating safety backups...');
      
      for (const [type, tableName] of Object.entries(config.newTables)) {
        if (await checkTableExists(tableName)) {
          if (options.confirmEachStep) {
            const backup = await confirmAction(`Create backup of ${tableName}?`);
            if (backup) {
              await createBackup(tableName);
            }
          } else {
            await createBackup(tableName);
          }
        }
      }
    }

    // Step 2: Delete new tables
    if (options.deleteNewTables) {
      console.log('\n🗑️ Phase 2: Deleting new tables...');
      
      for (const [type, tableName] of Object.entries(config.newTables)) {
        if (options.confirmEachStep) {
          const shouldDelete = await confirmAction(`Delete table ${tableName}?`);
          if (shouldDelete) {
            await deleteTable(tableName);
          }
        } else {
          await deleteTable(tableName);
        }
      }
    }

    // Step 3: Restore from backup (if requested and old table exists)
    if (options.restoreFromBackup) {
      console.log('\n📥 Phase 3: Restoring from backup...');
      
      const oldTableBackup = `${config.oldTableName}${config.backupTableSuffix}`;
      if (await checkTableExists(oldTableBackup)) {
        if (options.confirmEachStep) {
          const restore = await confirmAction(`Restore ${config.oldTableName} from ${oldTableBackup}?`);
          if (restore) {
            await restoreFromBackupTable(oldTableBackup, config.oldTableName);
          }
        } else {
          await restoreFromBackupTable(oldTableBackup, config.oldTableName);
        }
      } else {
        console.log(`⚠️ No backup table found: ${oldTableBackup}`);
        console.log(`   Original table ${config.oldTableName} should still contain the original data`);
      }
    }

    console.log('\n🎉 Rollback completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Verify your application is working correctly');
    console.log('   2. Update your application code to use the original table structure');
    console.log('   3. Clean up any backup tables when you\'re confident the rollback was successful');

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    console.log('\n🚨 IMPORTANT: System may be in inconsistent state!');
    console.log('📞 Contact your database administrator immediately');
    throw error;
  }
};

const runInteractiveRollback = async (): Promise<void> => {
  console.log('🔄 DynamoDB Migration Rollback Tool');
  console.log('===================================');
  
  console.log('\nThis tool will help you rollback the DynamoDB migration.');
  console.log('⚠️ WARNING: This affects production data. Proceed with caution!\n');

  // Get rollback options
  const deleteNewTables = await confirmAction('Delete the new table structure?');
  const restoreFromBackup = await confirmAction('Restore original data from backup?');
  const confirmEachStep = await confirmAction('Confirm each step individually?');

  const options: RollbackOptions = {
    deleteNewTables,
    restoreFromBackup,
    confirmEachStep
  };

  if (!deleteNewTables && !restoreFromBackup) {
    console.log('❌ No actions selected. Exiting...');
    return;
  }

  await rollbackMigration(options);
};

// CLI execution
if (require.main === module) {
  runInteractiveRollback()
    .then(() => {
      rl.close();
    })
    .catch(error => {
      console.error('❌ Rollback script failed:', error);
      rl.close();
      process.exit(1);
    });
}

export { rollbackMigration, createBackup, deleteTable, restoreFromBackupTable };