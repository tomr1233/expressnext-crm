import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb'
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

const BASE_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'expressnext-crm'

const TABLE_CONFIGS = [
  {
    name: `${BASE_TABLE_NAME}-users`,
    keySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' }
    ],
    attributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'role', AttributeType: 'S' }
    ],
    globalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'role-index',
        KeySchema: [{ AttributeName: 'role', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    name: `${BASE_TABLE_NAME}-leads`,
    keySchema: [
      { AttributeName: 'lead_id', KeyType: 'HASH' },
      { AttributeName: 'created_at', KeyType: 'RANGE' }
    ],
    attributeDefinitions: [
      { AttributeName: 'lead_id', AttributeType: 'S' },
      { AttributeName: 'created_at', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'company', AttributeType: 'S' }
    ],
    globalSecondaryIndexes: [
      {
        IndexName: 'status-created_at-index',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'created_at', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'company-index',
        KeySchema: [{ AttributeName: 'company', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    name: `${BASE_TABLE_NAME}-deals`,
    keySchema: [
      { AttributeName: 'deal_id', KeyType: 'HASH' },
      { AttributeName: 'pipeline_id', KeyType: 'RANGE' }
    ],
    attributeDefinitions: [
      { AttributeName: 'deal_id', AttributeType: 'S' },
      { AttributeName: 'pipeline_id', AttributeType: 'S' },
      { AttributeName: 'stage', AttributeType: 'S' },
      { AttributeName: 'due_date', AttributeType: 'S' },
      { AttributeName: 'owner', AttributeType: 'S' }
    ],
    globalSecondaryIndexes: [
      {
        IndexName: 'stage-due_date-index',
        KeySchema: [
          { AttributeName: 'stage', KeyType: 'HASH' },
          { AttributeName: 'due_date', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'owner-created_at-index',
        KeySchema: [
          { AttributeName: 'owner', KeyType: 'HASH' },
          { AttributeName: 'created_at', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    name: `${BASE_TABLE_NAME}-resources`,
    keySchema: [
      { AttributeName: 'resource_id', KeyType: 'HASH' },
      { AttributeName: 'category', KeyType: 'RANGE' }
    ],
    attributeDefinitions: [
      { AttributeName: 'resource_id', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' },
      { AttributeName: 'department', AttributeType: 'S' },
      { AttributeName: 'upload_date', AttributeType: 'S' },
      { AttributeName: 'google_drive_id', AttributeType: 'S' }
    ],
    globalSecondaryIndexes: [
      {
        IndexName: 'department-upload_date-index',
        KeySchema: [
          { AttributeName: 'department', KeyType: 'HASH' },
          { AttributeName: 'upload_date', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'google_drive_id-index',
        KeySchema: [{ AttributeName: 'google_drive_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  }
]

async function createTable(config: any) {
  try {
    // Check if table already exists
    try {
      await client.send(new DescribeTableCommand({ TableName: config.name }))
      console.log(`Table ${config.name} already exists.`)
      return
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error
      }
    }

    console.log(`Creating DynamoDB table: ${config.name}`)

    const createTableCommand = new CreateTableCommand({
      TableName: config.name,
      KeySchema: config.keySchema,
      AttributeDefinitions: config.attributeDefinitions,
      GlobalSecondaryIndexes: config.globalSecondaryIndexes?.map((gsi: any) => ({
        ...gsi,
        ProvisionedThroughput: undefined // Use on-demand billing
      })),
      BillingMode: 'PAY_PER_REQUEST'
    })

    await client.send(createTableCommand)
    console.log(`Table ${config.name} created successfully!`)

    // Wait for table to be active
    console.log(`Waiting for table ${config.name} to be active...`)
    let tableStatus = 'CREATING'
    while (tableStatus !== 'ACTIVE') {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const describeResult = await client.send(new DescribeTableCommand({ TableName: config.name }))
      tableStatus = describeResult.Table?.TableStatus || 'CREATING'
      console.log(`Table ${config.name} status: ${tableStatus}`)
    }

    console.log(`Table ${config.name} is now active!`)
  } catch (error) {
    console.error(`Error creating table ${config.name}:`, error)
    throw error
  }
}

export async function createAllTables() {
  console.log('Creating all DynamoDB tables...')
  
  for (const config of TABLE_CONFIGS) {
    await createTable(config)
  }
  
  console.log('All tables created successfully!')
}

// Run if executed directly
if (require.main === module) {
  createAllTables()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}