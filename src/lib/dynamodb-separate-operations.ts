import { PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { 
  getDynamoDbClient, 
  TABLE_NAMES, 
  User, 
  Lead, 
  Deal, 
  Resource, 
  Pipeline,
  CustomField,
  generateUserKey, 
  generateLeadKey, 
  generateDealKey, 
  generateResourceKey 
} from './dynamodb-separate'
import { v4 as uuidv4 } from 'uuid'

// User Operations
export class UserOperations {
  static async createUser(userData: Omit<User, 'user_id' | 'created_at' | 'updated_at'>): Promise<User> {
    const userId = uuidv4()
    const now = new Date().toISOString()
    
    const user: User = {
      user_id: userId,
      ...userData,
      created_at: now,
      updated_at: now
    }

    await getDynamoDbClient().send(new PutCommand({
      TableName: TABLE_NAMES.USERS,
      Item: user
    }))

    return user
  }

  static async getUser(userId: string): Promise<User | null> {
    const result = await getDynamoDbClient().send(new GetCommand({
      TableName: TABLE_NAMES.USERS,
      Key: generateUserKey(userId)
    }))

    return result.Item as User || null
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.USERS,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    }))

    const users = result.Items as User[] || []
    return users.length > 0 ? users[0] : null
  }

  static async getAllUsers(): Promise<User[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAMES.USERS
    }))

    return result.Items as User[] || []
  }

  static async getUsersByRole(role: string): Promise<User[]> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.USERS,
      IndexName: 'role-index',
      KeyConditionExpression: 'role = :role',
      ExpressionAttributeValues: {
        ':role': role
      }
    }))

    return result.Items as User[] || []
  }

  static async updateUser(userId: string, updates: Partial<Omit<User, 'user_id' | 'created_at'>>): Promise<User> {
    const updateExpression = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(updates)) {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = value
    }

    updateExpression.push('#updated_at = :updated_at')
    expressionAttributeNames['#updated_at'] = 'updated_at'
    expressionAttributeValues[':updated_at'] = new Date().toISOString()

    const result = await getDynamoDbClient().send(new UpdateCommand({
      TableName: TABLE_NAMES.USERS,
      Key: generateUserKey(userId),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }))

    return result.Attributes as User
  }

  static async deleteUser(userId: string): Promise<void> {
    await getDynamoDbClient().send(new DeleteCommand({
      TableName: TABLE_NAMES.USERS,
      Key: generateUserKey(userId)
    }))
  }

  static async updateLastLogin(userId: string): Promise<User> {
    return this.updateUser(userId, {
      last_login: new Date().toISOString()
    })
  }
}

// Lead Operations
export class LeadOperations {
  static async createLead(leadData: Omit<Lead, 'lead_id' | 'created_at' | 'updated_at'>): Promise<Lead> {
    const leadId = uuidv4()
    const now = new Date().toISOString()
    
    const lead: Lead = {
      lead_id: leadId,
      created_at: now,
      ...leadData,
      updated_at: now
    }

    await getDynamoDbClient().send(new PutCommand({
      TableName: TABLE_NAMES.LEADS,
      Item: lead
    }))

    return lead
  }

  static async getLead(leadId: string, createdAt: string): Promise<Lead | null> {
    const result = await getDynamoDbClient().send(new GetCommand({
      TableName: TABLE_NAMES.LEADS,
      Key: generateLeadKey(leadId, createdAt)
    }))

    return result.Item as Lead || null
  }

  static async getLeadById(leadId: string): Promise<Lead | null> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.LEADS,
      KeyConditionExpression: 'lead_id = :lead_id',
      ExpressionAttributeValues: {
        ':lead_id': leadId
      },
      Limit: 1
    }))

    const leads = result.Items as Lead[] || []
    return leads.length > 0 ? leads[0] : null
  }

  static async getAllLeads(): Promise<Lead[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAMES.LEADS
    }))

    return result.Items as Lead[] || []
  }

  static async getLeadsByStatus(status: string): Promise<Lead[]> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.LEADS,
      IndexName: 'status-created_at-index',
      KeyConditionExpression: 'status = :status',
      ExpressionAttributeValues: {
        ':status': status
      }
    }))

    return result.Items as Lead[] || []
  }

  static async getLeadsByCompany(company: string): Promise<Lead[]> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.LEADS,
      IndexName: 'company-index',
      KeyConditionExpression: 'company = :company',
      ExpressionAttributeValues: {
        ':company': company
      }
    }))

    return result.Items as Lead[] || []
  }

  static async updateLead(leadId: string, createdAt: string, updates: Partial<Omit<Lead, 'lead_id' | 'created_at'>>): Promise<Lead> {
    const updateExpression = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(updates)) {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = value
    }

    updateExpression.push('#updated_at = :updated_at')
    expressionAttributeNames['#updated_at'] = 'updated_at'
    expressionAttributeValues[':updated_at'] = new Date().toISOString()

    const result = await getDynamoDbClient().send(new UpdateCommand({
      TableName: TABLE_NAMES.LEADS,
      Key: generateLeadKey(leadId, createdAt),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }))

    return result.Attributes as Lead
  }

  static async deleteLead(leadId: string, createdAt: string): Promise<void> {
    await getDynamoDbClient().send(new DeleteCommand({
      TableName: TABLE_NAMES.LEADS,
      Key: generateLeadKey(leadId, createdAt)
    }))
  }

  static async updateLeadPipelineStage(leadId: string, createdAt: string, pipelineId: string, stage: string): Promise<Lead> {
    return this.updateLead(leadId, createdAt, {
      pipeline_id: pipelineId,
      pipeline_stage: stage,
      stage_changed_at: new Date().toISOString()
    })
  }
}

// Deal Operations
export class DealOperations {
  static async createDeal(dealData: Omit<Deal, 'deal_id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    const dealId = uuidv4()
    const now = new Date().toISOString()
    
    const deal: Deal = {
      deal_id: dealId,
      ...dealData,
      created_at: now,
      updated_at: now,
      custom_fields: dealData.custom_fields || []
    }

    await getDynamoDbClient().send(new PutCommand({
      TableName: TABLE_NAMES.DEALS,
      Item: deal
    }))

    return deal
  }

  static async getDeal(dealId: string, pipelineId: string): Promise<Deal | null> {
    const result = await getDynamoDbClient().send(new GetCommand({
      TableName: TABLE_NAMES.DEALS,
      Key: generateDealKey(dealId, pipelineId)
    }))

    return result.Item as Deal || null
  }

  static async getDealById(dealId: string): Promise<Deal | null> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.DEALS,
      KeyConditionExpression: 'deal_id = :deal_id',
      ExpressionAttributeValues: {
        ':deal_id': dealId
      },
      Limit: 1
    }))

    const deals = result.Items as Deal[] || []
    return deals.length > 0 ? deals[0] : null
  }

  static async getAllDeals(): Promise<Deal[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAMES.DEALS
    }))

    return result.Items as Deal[] || []
  }

  static async getDealsByStage(stage: string): Promise<Deal[]> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.DEALS,
      IndexName: 'stage-due_date-index',
      KeyConditionExpression: 'stage = :stage',
      ExpressionAttributeValues: {
        ':stage': stage
      }
    }))

    return result.Items as Deal[] || []
  }

  static async getDealsByOwner(owner: string): Promise<Deal[]> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.DEALS,
      IndexName: 'owner-created_at-index',
      KeyConditionExpression: 'owner = :owner',
      ExpressionAttributeValues: {
        ':owner': owner
      }
    }))

    return result.Items as Deal[] || []
  }

  static async getDealsByPipeline(pipelineId: string): Promise<Deal[]> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.DEALS,
      KeyConditionExpression: 'pipeline_id = :pipeline_id',
      ExpressionAttributeValues: {
        ':pipeline_id': pipelineId
      },
      ScanIndexForward: false // Sort by sort key descending
    }))

    return result.Items as Deal[] || []
  }

  static async updateDeal(dealId: string, pipelineId: string, updates: Partial<Omit<Deal, 'deal_id' | 'pipeline_id' | 'created_at'>>): Promise<Deal> {
    const updateExpression = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(updates)) {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = value
    }

    updateExpression.push('#updated_at = :updated_at')
    expressionAttributeNames['#updated_at'] = 'updated_at'
    expressionAttributeValues[':updated_at'] = new Date().toISOString()

    const result = await getDynamoDbClient().send(new UpdateCommand({
      TableName: TABLE_NAMES.DEALS,
      Key: generateDealKey(dealId, pipelineId),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }))

    return result.Attributes as Deal
  }

  static async deleteDeal(dealId: string, pipelineId: string): Promise<void> {
    await getDynamoDbClient().send(new DeleteCommand({
      TableName: TABLE_NAMES.DEALS,
      Key: generateDealKey(dealId, pipelineId)
    }))
  }

  static async addCustomField(dealId: string, pipelineId: string, customField: CustomField): Promise<Deal> {
    const deal = await this.getDeal(dealId, pipelineId)
    if (!deal) {
      throw new Error('Deal not found')
    }

    const existingFields = deal.custom_fields || []
    const updatedFields = existingFields.filter(field => field.key !== customField.key)
    updatedFields.push(customField)

    return this.updateDeal(dealId, pipelineId, {
      custom_fields: updatedFields
    })
  }

  static async removeCustomField(dealId: string, pipelineId: string, fieldKey: string): Promise<Deal> {
    const deal = await this.getDeal(dealId, pipelineId)
    if (!deal) {
      throw new Error('Deal not found')
    }

    const updatedFields = (deal.custom_fields || []).filter(field => field.key !== fieldKey)

    return this.updateDeal(dealId, pipelineId, {
      custom_fields: updatedFields
    })
  }

  static async updateCustomField(dealId: string, pipelineId: string, fieldKey: string, newValue: string | number | boolean): Promise<Deal> {
    const deal = await this.getDeal(dealId, pipelineId)
    if (!deal) {
      throw new Error('Deal not found')
    }

    const updatedFields = (deal.custom_fields || []).map(field => 
      field.key === fieldKey ? { ...field, value: newValue } : field
    )

    return this.updateDeal(dealId, pipelineId, {
      custom_fields: updatedFields
    })
  }
}

// Resource Operations
export class ResourceOperations {
  static async createResource(resourceData: Omit<Resource, 'resource_id' | 'created_at' | 'updated_at'>): Promise<Resource> {
    const resourceId = uuidv4()
    const now = new Date().toISOString()
    
    const resource: Resource = {
      resource_id: resourceId,
      ...resourceData,
      created_at: now,
      updated_at: now
    }

    await getDynamoDbClient().send(new PutCommand({
      TableName: TABLE_NAMES.RESOURCES,
      Item: resource
    }))

    return resource
  }

  static async getResource(resourceId: string, category: string): Promise<Resource | null> {
    const result = await getDynamoDbClient().send(new GetCommand({
      TableName: TABLE_NAMES.RESOURCES,
      Key: generateResourceKey(resourceId, category)
    }))

    return result.Item as Resource || null
  }

  static async getResourceById(resourceId: string): Promise<Resource | null> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.RESOURCES,
      KeyConditionExpression: 'resource_id = :resource_id',
      ExpressionAttributeValues: {
        ':resource_id': resourceId
      },
      Limit: 1
    }))

    const resources = result.Items as Resource[] || []
    return resources.length > 0 ? resources[0] : null
  }

  static async getAllResources(): Promise<Resource[]> {
    const result = await getDynamoDbClient().send(new ScanCommand({
      TableName: TABLE_NAMES.RESOURCES
    }))

    return result.Items as Resource[] || []
  }

  static async getResourcesByCategory(category: string): Promise<Resource[]> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.RESOURCES,
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': category
      },
      ScanIndexForward: false
    }))

    return result.Items as Resource[] || []
  }

  static async getResourcesByDepartment(department: string): Promise<Resource[]> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.RESOURCES,
      IndexName: 'department-upload_date-index',
      KeyConditionExpression: 'department = :department',
      ExpressionAttributeValues: {
        ':department': department
      }
    }))

    return result.Items as Resource[] || []
  }

  static async getResourceByGoogleDriveId(googleDriveId: string): Promise<Resource | null> {
    const result = await getDynamoDbClient().send(new QueryCommand({
      TableName: TABLE_NAMES.RESOURCES,
      IndexName: 'google_drive_id-index',
      KeyConditionExpression: 'google_drive_id = :google_drive_id',
      ExpressionAttributeValues: {
        ':google_drive_id': googleDriveId
      }
    }))

    const resources = result.Items as Resource[] || []
    return resources.length > 0 ? resources[0] : null
  }

  static async updateResource(resourceId: string, category: string, updates: Partial<Omit<Resource, 'resource_id' | 'category' | 'created_at'>>): Promise<Resource> {
    const updateExpression = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(updates)) {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = value
    }

    updateExpression.push('#updated_at = :updated_at')
    expressionAttributeNames['#updated_at'] = 'updated_at'
    expressionAttributeValues[':updated_at'] = new Date().toISOString()

    const result = await getDynamoDbClient().send(new UpdateCommand({
      TableName: TABLE_NAMES.RESOURCES,
      Key: generateResourceKey(resourceId, category),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }))

    return result.Attributes as Resource
  }

  static async deleteResource(resourceId: string, category: string): Promise<void> {
    await getDynamoDbClient().send(new DeleteCommand({
      TableName: TABLE_NAMES.RESOURCES,
      Key: generateResourceKey(resourceId, category)
    }))
  }

  static async updateResourceSyncStatus(resourceId: string, category: string, syncStatus: 'synced' | 'pending' | 'error' | 'deleted', lastSyncedAt?: string): Promise<Resource> {
    const updates: Partial<Resource> = {
      sync_status: syncStatus
    }

    if (lastSyncedAt) {
      updates.last_synced_at = lastSyncedAt
    }

    return this.updateResource(resourceId, category, updates)
  }
}

// Pipeline Operations (stored in deals table or separate if needed)
export class PipelineOperations {
  // These could be stored in a separate pipelines table or in the deals table
  // For now, implementing as in-memory operations, but can be moved to DynamoDB
  
  static async createPipeline(pipelineData: Omit<Pipeline, 'pipeline_id' | 'created_at' | 'updated_at'>): Promise<Pipeline> {
    const pipelineId = uuidv4()
    const now = new Date().toISOString()
    
    const pipeline: Pipeline = {
      pipeline_id: pipelineId,
      ...pipelineData,
      created_at: now,
      updated_at: now
    }

    // TODO: Store in DynamoDB if you want persistent pipelines
    // For now, this is a placeholder implementation
    return pipeline
  }

  static async getAllPipelines(): Promise<Pipeline[]> {
    // TODO: Implement pipeline storage in DynamoDB
    // For now, return default pipeline
    return [{
      pipeline_id: 'default-pipeline',
      name: 'Default Sales Pipeline',
      stages: [
        { id: 'contacted', name: 'Contacted', order: 1, color: '#3b82f6' },
        { id: 'demo', name: 'Demo', order: 2, color: '#8b5cf6' },
        { id: 'negotiating', name: 'Negotiating', order: 3, color: '#f59e0b' },
        { id: 'proposal', name: 'Proposal', order: 4, color: '#10b981' }
      ],
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]
  }
}