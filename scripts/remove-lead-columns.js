const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
require('dotenv').config({ path: '.env.local' });

// Validate environment variables
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
  console.error('Missing required AWS environment variables:');
  console.error('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'MISSING');
  console.error('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'MISSING');
  console.error('AWS_REGION:', process.env.AWS_REGION ? 'SET' : 'MISSING');
  process.exit(1);
}

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
  }
});

const TABLE_NAME = 'CRM-Leads-v2'; // Update this to match your actual table name

async function testCredentials() {
  try {
    console.log('Testing AWS credentials...');
    console.log('Region:', process.env.AWS_REGION);
    console.log('Access Key ID (first 4 chars):', process.env.AWS_ACCESS_KEY_ID.substring(0, 4) + '...');
    
    // Try to list tables to test credentials and get table info
    const { DynamoDBClient, ListTablesCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
    const testClient = new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
      }
    });
    
    const listResult = await testClient.send(new ListTablesCommand({}));
    console.log('Available tables:', listResult.TableNames);
    
    // Get table schema
    const describeResult = await testClient.send(new DescribeTableCommand({
      TableName: TABLE_NAME
    }));
    console.log('Table key schema:', describeResult.Table.KeySchema);
    console.log('Attribute definitions:', describeResult.Table.AttributeDefinitions);
    
    return true;
  } catch (error) {
    console.error('Credential test failed:', error.message);
    return false;
  }
}

async function removeColumnsFromLeads() {
  console.log('Starting to remove bio_match and followers columns from leads table...');
  
  // Test credentials first
  const credentialsValid = await testCredentials();
  if (!credentialsValid) {
    console.error('Exiting due to credential issues');
    return;
  }
  
  let lastEvaluatedKey = null;
  let itemsProcessed = 0;
  let itemsUpdated = 0;
  
  do {
    try {
      // Scan the table
      const scanParams = {
        TableName: TABLE_NAME,
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
      };
      
      const scanResult = await dynamoClient.send(new ScanCommand(scanParams));
      
      // Process each item
      for (const item of scanResult.Items || []) {
        const unmarshalled = unmarshall(item);
        itemsProcessed++;
        
        // Debug: Show first item structure
        if (itemsProcessed === 1) {
          console.log('Sample item structure:');
          console.log('Raw item keys:', Object.keys(item));
          console.log('Unmarshalled item keys:', Object.keys(unmarshalled));
          console.log('Sample item ID field:', unmarshalled.id || 'NO ID FIELD');
          console.log('Available key fields:', Object.keys(unmarshalled).filter(key => 
            ['id', 'pk', 'partitionKey', 'hashKey', 'leadId'].includes(key.toLowerCase())
          ));
        }
        
        // Check if the item has bio_match or followers attributes
        const hasBioMatch = 'bio_match' in unmarshalled;
        const hasFollowers = 'followers' in unmarshalled;
        
        if (hasBioMatch || hasFollowers) {
          // Update the item to remove these attributes
          const removeExpressions = [];
          const expressionAttributeNames = {};
          
          if (hasBioMatch) {
            removeExpressions.push('#bio_match');
            expressionAttributeNames['#bio_match'] = 'bio_match';
          }
          
          if (hasFollowers) {
            removeExpressions.push('#followers');
            expressionAttributeNames['#followers'] = 'followers';
          }
          
          const updateParams = {
            TableName: TABLE_NAME,
            Key: {
              PK: item.PK,
              SK: item.SK
            },
            UpdateExpression: 'REMOVE ' + removeExpressions.join(', '),
            ExpressionAttributeNames: expressionAttributeNames
          };
          
          try {
            await dynamoClient.send(new UpdateItemCommand(updateParams));
            itemsUpdated++;
            console.log(`Updated item ${unmarshalled.id} - Removed: ${hasBioMatch ? 'bio_match ' : ''}${hasFollowers ? 'followers' : ''}`);
          } catch (updateError) {
            console.error(`Failed to update item ${unmarshalled.id}:`, updateError);
          }
        }
      }
      
      lastEvaluatedKey = scanResult.LastEvaluatedKey;
      console.log(`Processed ${itemsProcessed} items so far...`);
      
    } catch (error) {
      console.error('Error scanning table:', error);
      break;
    }
  } while (lastEvaluatedKey);
  
  console.log(`\nCompleted! Processed ${itemsProcessed} items, updated ${itemsUpdated} items.`);
}

// Run the script
removeColumnsFromLeads().catch(console.error);