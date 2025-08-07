#!/usr/bin/env tsx

/**
 * DynamoDB Table Creation Script
 * Creates the new optimized table structure
 */

import { 
  DynamoDBClient, 
  CreateTableCommand, 
  DescribeTableCommand,
  BillingMode,
  KeyType,
  AttributeDefinition,
  GlobalSecondaryIndex
} from '@aws-sdk/client-dynamodb';

const config = {
  region: process.env.AWS_REGION || 'ap-southeast-2',
  tables: {
    leads: process.env.LEADS_TABLE || 'CRM-Leads-v2',
    deals: process.env.DEALS_TABLE || 'CRM-Deals-v2',
    resources: process.env.RESOURCES_TABLE || 'CRM-Resources-v2', 
    pipelines: process.env.PIPELINES_TABLE || 'CRM-Pipelines-v2'
  }
};

const client = new DynamoDBClient({ region: config.region });

// Common attribute definitions
const commonAttributes: AttributeDefinition[] = [
  { AttributeName: 'PK', AttributeType: 'S' },
  { AttributeName: 'SK', AttributeType: 'S' },
  { AttributeName: 'GSI1PK', AttributeType: 'S' },
  { AttributeName: 'GSI1SK', AttributeType: 'S' },
  { AttributeName: 'GSI2PK', AttributeType: 'S' },
  { AttributeName: 'GSI2SK', AttributeType: 'S' }
];

// Common GSI definitions
const createGSIs = (): GlobalSecondaryIndex[] => [
  {
    IndexName: 'GSI1',
    KeySchema: [
      { AttributeName: 'GSI1PK', KeyType: KeyType.HASH },
      { AttributeName: 'GSI1SK', KeyType: KeyType.RANGE }
    ],
    Projection: { ProjectionType: 'ALL' }
  },
  {
    IndexName: 'GSI2', 
    KeySchema: [
      { AttributeName: 'GSI2PK', KeyType: KeyType.HASH },
      { AttributeName: 'GSI2SK', KeyType: KeyType.RANGE }
    ],
    Projection: { ProjectionType: 'ALL' }
  }
];

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

const createTable = async (tableName: string, description: string): Promise<void> => {
  console.log(`🔨 Creating table: ${tableName}`);
  
  if (await checkTableExists(tableName)) {
    console.log(`⚠️ Table ${tableName} already exists, skipping...`);
    return;
  }

  const command = new CreateTableCommand({
    TableName: tableName,
    BillingMode: BillingMode.PAY_PER_REQUEST,
    AttributeDefinitions: commonAttributes,
    KeySchema: [
      { AttributeName: 'PK', KeyType: KeyType.HASH },
      { AttributeName: 'SK', KeyType: KeyType.RANGE }
    ],
    GlobalSecondaryIndexes: createGSIs(),
    Tags: [
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
      { Key: 'Application', Value: 'ExpressNext-CRM' },
      { Key: 'Purpose', Value: description }
    ]
  });

  try {
    const response = await client.send(command);
    console.log(`✅ Table ${tableName} created successfully`);
    console.log(`📋 Table ARN: ${response.TableDescription?.TableArn}`);
  } catch (error) {
    console.error(`❌ Failed to create table ${tableName}:`, error);
    throw error;
  }
};

const waitForTable = async (tableName: string): Promise<void> => {
  console.log(`⏳ Waiting for table ${tableName} to be active...`);
  
  while (true) {
    try {
      const response = await client.send(new DescribeTableCommand({ TableName: tableName }));
      const status = response.Table?.TableStatus;
      
      if (status === 'ACTIVE') {
        console.log(`✅ Table ${tableName} is now active`);
        break;
      }
      
      console.log(`⏳ Table ${tableName} status: ${status}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`❌ Error checking table status:`, error);
      throw error;
    }
  }
};

const createAllTables = async (): Promise<void> => {
  console.log('🚀 Creating DynamoDB tables for CRM v2...');
  console.log('📋 Configuration:');
  console.log(`   Region: ${config.region}`);
  console.log(`   Tables to create:`, Object.values(config.tables));

  const tableDefinitions = [
    { 
      name: config.tables.leads, 
      description: 'Lead management and prospecting data' 
    },
    { 
      name: config.tables.deals, 
      description: 'Sales pipeline and deal tracking' 
    },
    { 
      name: config.tables.resources, 
      description: 'File and document management' 
    },
    { 
      name: config.tables.pipelines, 
      description: 'Sales pipeline configuration' 
    }
  ];

  try {
    // Create all tables
    for (const table of tableDefinitions) {
      await createTable(table.name, table.description);
    }

    // Wait for all tables to be active
    for (const table of tableDefinitions) {
      if (!await checkTableExists(table.name)) continue;
      await waitForTable(table.name);
    }

    console.log('🎉 All tables created and active!');
    console.log('\n📊 Table Summary:');
    console.log('┌────────────────────────────────────┬─────────────────────────────────────┐');
    console.log('│ Table Name                         │ Purpose                             │');
    console.log('├────────────────────────────────────┼─────────────────────────────────────┤');
    console.log(`│ ${config.tables.leads.padEnd(34)} │ Lead management & prospecting       │`);
    console.log(`│ ${config.tables.deals.padEnd(34)} │ Sales pipeline & deal tracking      │`);
    console.log(`│ ${config.tables.resources.padEnd(34)} │ File & document management          │`);
    console.log(`│ ${config.tables.pipelines.padEnd(34)} │ Sales pipeline configuration        │`);
    console.log('└────────────────────────────────────┴─────────────────────────────────────┘');

    console.log('\n🔑 Access Patterns Supported:');
    console.log('• Time-based queries (SK with date prefix)');
    console.log('• Status/Stage filtering (GSI1)'); 
    console.log('• Entity relationships (GSI2)');
    console.log('• Efficient pagination and sorting');

  } catch (error) {
    console.error('❌ Failed to create tables:', error);
    process.exit(1);
  }
};

// CLI execution
if (require.main === module) {
  createAllTables();
}

export { createAllTables, createTable, checkTableExists };