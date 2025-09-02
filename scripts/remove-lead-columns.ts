import { DynamoDBClient, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const TABLE_NAME = 'leads'; // Update this to match your actual table name

async function removeColumnsFromLeads(): Promise<void> {
  console.log('Starting to remove bio_match and followers columns from leads table...');
  
  let lastEvaluatedKey: Record<string, any> | undefined = undefined;
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
        
        // Check if the item has bio_match or followers attributes
        const hasBioMatch = 'bio_match' in unmarshalled;
        const hasFollowers = 'followers' in unmarshalled;
        
        if (hasBioMatch || hasFollowers) {
          // Update the item to remove these attributes
          const updateExpressions: string[] = [];
          const expressionAttributeNames: Record<string, string> = {};
          
          if (hasBioMatch) {
            updateExpressions.push('REMOVE #bio_match');
            expressionAttributeNames['#bio_match'] = 'bio_match';
          }
          
          if (hasFollowers) {
            updateExpressions.push('REMOVE #followers');
            expressionAttributeNames['#followers'] = 'followers';
          }
          
          const updateParams = {
            TableName: TABLE_NAME,
            Key: {
              id: item.id // Assuming 'id' is your primary key
            },
            UpdateExpression: updateExpressions.join(', '),
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