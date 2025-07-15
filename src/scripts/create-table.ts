import dotenv from 'dotenv'
import path from 'path'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
})

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'expressnext-crm'

export async function createTable() {
  try {
    // Check if table already exists
    try {
      await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }))
      console.log(`Table ${TABLE_NAME} already exists`)
      return
    } catch (error) {
      // Table doesn't exist, continue to create it
    }

    console.log(`Creating table: ${TABLE_NAME}`)

    const createTableCommand = new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'pk', AttributeType: 'S' },
        { AttributeName: 'sk', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })

    await client.send(createTableCommand)
    console.log(`Table ${TABLE_NAME} created successfully!`)

    // Wait for table to be active
    console.log('Waiting for table to be active...')
    let tableStatus = 'CREATING'
    while (tableStatus !== 'ACTIVE') {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const response = await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }))
      tableStatus = response.Table?.TableStatus || 'UNKNOWN'
      console.log(`Table status: ${tableStatus}`)
    }

    console.log('Table is now active!')
  } catch (error) {
    console.error('Error creating table:', error)
    throw error
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  createTable()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}