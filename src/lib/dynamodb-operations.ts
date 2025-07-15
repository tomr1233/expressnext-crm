import { PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoDbClient, TABLE_NAME, Lead, Pipeline, Deal, Resource, generateLeadKey, generatePipelineKey, generateDealKey, generateResourceKey } from './dynamodb'
import { v4 as uuidv4 } from 'uuid'

// Lead Operations
export class LeadOperations {
  static async createLead(leadData: Omit<Lead, 'pk' | 'sk' | 'id' | 'created_at' | 'updated_at' | 'entity_type'>): Promise<Lead> {
    const id = uuidv4()
    const now = new Date().toISOString()
    
    const lead: Lead = {
      ...generateLeadKey(id),
      id,
      ...leadData,
      created_at: now,
      updated_at: now,
      entity_type: 'LEAD'
    }

    await getDynamoDbClient().send(new PutCommand({
      TableName: TABLE_NAME,
      Item: lead
    }))

    return lead
  }

  static async getLead(leadId: string): Promise<Lead | null> {
    const result = await getDynamoDbClient().send(new GetCommand({
      TableName: TABLE_NAME,
      Key: generateLeadKey(leadId)
    }))

    return result.Item as Lead || null
  }

  static async getAllLeads(): Promise<Lead[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entity_type = :type',
      ExpressionAttributeValues: {
        ':type': 'LEAD'
      }
    }))

    return result.Items as Lead[] || []
  }

  static async updateLead(leadId: string, updates: Partial<Omit<Lead, 'pk' | 'sk' | 'id' | 'created_at' | 'entity_type'>>): Promise<Lead> {
    const updateExpression = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(updates)) {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = value
    }

    // Always update the updated_at timestamp
    updateExpression.push('#updated_at = :updated_at')
    expressionAttributeNames['#updated_at'] = 'updated_at'
    expressionAttributeValues[':updated_at'] = new Date().toISOString()

    const result = await getDynamoDbClient().send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: generateLeadKey(leadId),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }))

    return result.Attributes as Lead
  }

  static async deleteLead(leadId: string): Promise<void> {
    await getDynamoDbClient().send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: generateLeadKey(leadId)
    }))
  }

  static async getLeadsByPipeline(pipelineId: string): Promise<Lead[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entity_type = :type AND pipeline_id = :pipeline_id',
      ExpressionAttributeValues: {
        ':type': 'LEAD',
        ':pipeline_id': pipelineId
      }
    }))

    return result.Items as Lead[] || []
  }

  static async updateLeadPipelineStage(leadId: string, pipelineId: string, stage: string): Promise<Lead> {
    return this.updateLead(leadId, {
      pipeline_id: pipelineId,
      pipeline_stage: stage,
      stage_changed_at: new Date().toISOString()
    })
  }
}

// Pipeline Operations
export class PipelineOperations {
  static async createPipeline(pipelineData: Omit<Pipeline, 'pk' | 'sk' | 'id' | 'created_at' | 'updated_at' | 'entity_type'>): Promise<Pipeline> {
    const id = uuidv4()
    const now = new Date().toISOString()
    
    const pipeline: Pipeline = {
      ...generatePipelineKey(id),
      id,
      ...pipelineData,
      created_at: now,
      updated_at: now,
      entity_type: 'PIPELINE'
    }

    await getDynamoDbClient().send(new PutCommand({
      TableName: TABLE_NAME,
      Item: pipeline
    }))

    return pipeline
  }

  static async getPipeline(pipelineId: string): Promise<Pipeline | null> {
    const result = await getDynamoDbClient().send(new GetCommand({
      TableName: TABLE_NAME,
      Key: generatePipelineKey(pipelineId)
    }))

    return result.Item as Pipeline || null
  }

  static async getAllPipelines(): Promise<Pipeline[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entity_type = :type',
      ExpressionAttributeValues: {
        ':type': 'PIPELINE'
      }
    }))

    return result.Items as Pipeline[] || []
  }

  static async updatePipeline(pipelineId: string, updates: Partial<Omit<Pipeline, 'pk' | 'sk' | 'id' | 'created_at' | 'entity_type'>>): Promise<Pipeline> {
    const updateExpression = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(updates)) {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = value
    }

    // Always update the updated_at timestamp
    updateExpression.push('#updated_at = :updated_at')
    expressionAttributeNames['#updated_at'] = 'updated_at'
    expressionAttributeValues[':updated_at'] = new Date().toISOString()

    const result = await getDynamoDbClient().send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: generatePipelineKey(pipelineId),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }))

    return result.Attributes as Pipeline
  }

  static async deletePipeline(pipelineId: string): Promise<void> {
    await getDynamoDbClient().send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: generatePipelineKey(pipelineId)
    }))
  }

  static async getDefaultPipeline(): Promise<Pipeline | null> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entity_type = :type AND is_default = :is_default',
      ExpressionAttributeValues: {
        ':type': 'PIPELINE',
        ':is_default': true
      }
    }))

    const pipelines = result.Items as Pipeline[] || []
    return pipelines.length > 0 ? pipelines[0] : null
  }
}

// Deal Operations
export class DealOperations {
  static async createDeal(dealData: Omit<Deal, 'pk' | 'sk' | 'id' | 'created_at' | 'updated_at' | 'entity_type'>): Promise<Deal> {
    const id = uuidv4()
    const now = new Date().toISOString()
    
    const deal: Deal = {
      ...generateDealKey(id),
      id,
      ...dealData,
      created_at: now,
      updated_at: now,
      entity_type: 'DEAL'
    }

    await getDynamoDbClient().send(new PutCommand({
      TableName: TABLE_NAME,
      Item: deal
    }))

    return deal
  }

  static async getDeal(dealId: string): Promise<Deal | null> {
    const result = await getDynamoDbClient().send(new GetCommand({
      TableName: TABLE_NAME,
      Key: generateDealKey(dealId)
    }))

    return result.Item as Deal || null
  }

  static async getAllDeals(): Promise<Deal[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entity_type = :type',
      ExpressionAttributeValues: {
        ':type': 'DEAL'
      }
    }))

    return result.Items as Deal[] || []
  }

  static async getDealsByPipeline(pipelineId: string): Promise<Deal[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entity_type = :type AND pipeline_id = :pipeline_id',
      ExpressionAttributeValues: {
        ':type': 'DEAL',
        ':pipeline_id': pipelineId
      }
    }))

    return result.Items as Deal[] || []
  }

  static async updateDeal(dealId: string, updates: Partial<Omit<Deal, 'pk' | 'sk' | 'id' | 'created_at' | 'entity_type'>>): Promise<Deal> {
    const updateExpression = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(updates)) {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = value
    }

    // Always update the updated_at timestamp
    updateExpression.push('#updated_at = :updated_at')
    expressionAttributeNames['#updated_at'] = 'updated_at'
    expressionAttributeValues[':updated_at'] = new Date().toISOString()

    const result = await getDynamoDbClient().send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: generateDealKey(dealId),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }))

    return result.Attributes as Deal
  }

  static async deleteDeal(dealId: string): Promise<void> {
    await getDynamoDbClient().send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: generateDealKey(dealId)
    }))
  }
}

// Resource Operations
export class ResourceOperations {
  static async createResource(resourceData: Omit<Resource, 'pk' | 'sk' | 'id' | 'created_at' | 'updated_at' | 'entity_type'>): Promise<Resource> {
    const id = uuidv4()
    const now = new Date().toISOString()
    
    const resource: Resource = {
      ...generateResourceKey(id),
      id,
      ...resourceData,
      created_at: now,
      updated_at: now,
      entity_type: 'RESOURCE'
    }

    await getDynamoDbClient().send(new PutCommand({
      TableName: TABLE_NAME,
      Item: resource
    }))

    return resource
  }

  static async getResource(resourceId: string): Promise<Resource | null> {
    const result = await getDynamoDbClient().send(new GetCommand({
      TableName: TABLE_NAME,
      Key: generateResourceKey(resourceId)
    }))

    return result.Item as Resource || null
  }

  static async getAllResources(): Promise<Resource[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entity_type = :type',
      ExpressionAttributeValues: {
        ':type': 'RESOURCE'
      }
    }))

    return result.Items as Resource[] || []
  }

  static async updateResource(resourceId: string, updates: Partial<Omit<Resource, 'pk' | 'sk' | 'id' | 'created_at' | 'entity_type'>>): Promise<Resource> {
    const updateExpression = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(updates)) {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = value
    }

    // Always update the updated_at timestamp
    updateExpression.push('#updated_at = :updated_at')
    expressionAttributeNames['#updated_at'] = 'updated_at'
    expressionAttributeValues[':updated_at'] = new Date().toISOString()

    const result = await getDynamoDbClient().send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: generateResourceKey(resourceId),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }))

    return result.Attributes as Resource
  }

  static async deleteResource(resourceId: string): Promise<void> {
    await getDynamoDbClient().send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: generateResourceKey(resourceId)
    }))
  }

  static async getResourcesByCategory(category: string): Promise<Resource[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entity_type = :type AND category = :category',
      ExpressionAttributeValues: {
        ':type': 'RESOURCE',
        ':category': category
      }
    }))

    return result.Items as Resource[] || []
  }

  static async getResourcesByDepartment(department: string): Promise<Resource[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entity_type = :type AND department = :department',
      ExpressionAttributeValues: {
        ':type': 'RESOURCE',
        ':department': department
      }
    }))

    return result.Items as Resource[] || []
  }

  static async getResourceByGoogleDriveId(googleDriveId: string): Promise<Resource | null> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entity_type = :type AND google_drive_id = :google_drive_id',
      ExpressionAttributeValues: {
        ':type': 'RESOURCE',
        ':google_drive_id': googleDriveId
      }
    }))

    const resources = result.Items as Resource[] || []
    return resources.length > 0 ? resources[0] : null
  }

  static async updateResourceSyncStatus(resourceId: string, syncStatus: 'synced' | 'pending' | 'error' | 'deleted', lastSyncedAt?: string): Promise<Resource> {
    const updates: Partial<Resource> = {
      sync_status: syncStatus
    }

    if (lastSyncedAt) {
      updates.last_synced_at = lastSyncedAt
    }

    return this.updateResource(resourceId, updates)
  }
}