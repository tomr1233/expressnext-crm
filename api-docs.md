# ExpressNext CRM API Documentation

## Overview

This document provides comprehensive documentation for the ExpressNext CRM API endpoints. The API is built with Next.js 15 App Router and uses AWS Cognito for authentication, DynamoDB for data storage, and integrates with Google Drive and AWS S3.

## Base URL
```
http://localhost:3000/api (development)
https://your-domain.com/api (production)
```

## Authentication

Most endpoints require authentication using AWS Cognito tokens. Include the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## API Endpoints

### Authentication Endpoints

#### Sign In
**POST** `/api/auth/sign-in`

Authenticate user with AWS Cognito.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMi...",
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response (Challenge Required):**
```json
{
  "challengeName": "NEW_PASSWORD_REQUIRED",
  "session": "session_token"
}
```

#### Sign Up
**POST** `/api/auth/sign-up`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Confirm Sign Up
**POST** `/api/auth/confirm-sign-up`

Confirm user registration with verification code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "confirmationCode": "123456"
}
```

#### Confirm and Login
**POST** `/api/auth/confirm-and-login`

Confirm registration and automatically sign in.

#### Refresh Token
**POST** `/api/auth/refresh-token`

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMi..."
}
```

### CRM Data Endpoints

#### Leads

##### Get All Leads
**GET** `/api/leads`
- **Auth Required:** Yes
- **Description:** Retrieve all leads

**Response:**
```json
[
  {
    "id": "lead-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "status": "qualified",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

##### Create Lead
**POST** `/api/leads`
- **Auth Required:** Yes
- **Description:** Create a new lead

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Corp",
  "phone": "+1234567890",
  "status": "new"
}
```

##### Get/Update/Delete Lead by ID
**GET/PUT/DELETE** `/api/leads/[id]`
- **Auth Required:** Yes
- **Description:** Manage individual lead

#### Deals

##### Get All Deals
**GET** `/api/deals`
- **Auth Required:** Yes
- **Description:** Retrieve all deals

**Response:**
```json
[
  {
    "id": "deal-uuid",
    "title": "Enterprise Software Deal",
    "value": 50000,
    "stage": "negotiating",
    "lead_id": "lead-uuid",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

##### Create Deal
**POST** `/api/deals`
- **Auth Required:** Yes
- **Description:** Create a new deal

**Request Body:**
```json
{
  "title": "Enterprise Software Deal",
  "value": 50000,
  "stage": "contacted",
  "lead_id": "lead-uuid"
}
```

#### Pipelines
**GET** `/api/pipelines`
- **Auth Required:** Yes
- **Description:** Retrieve pipeline data for Kanban board view

### Resources Endpoints

#### Get All Resources
**GET** `/api/resources`
- **Auth Required:** Yes
- **Description:** Retrieve all resources with signed download URLs

**Response:**
```json
[
  {
    "id": "resource-uuid",
    "name": "proposal.pdf",
    "type": "document",
    "category": "proposals",
    "department": "sales",
    "size": 1024000,
    "upload_date": "2024-01-01T00:00:00Z",
    "uploaded_by": "user@example.com",
    "download_url": "https://bucket.s3.region.amazonaws.com/..."
  }
]
```

#### Create Resource
**POST** `/api/resources`
- **Auth Required:** Yes
- **Description:** Create resource metadata

**Request Body:**
```json
{
  "name": "proposal.pdf",
  "type": "document",
  "category": "proposals",
  "department": "sales",
  "description": "Client proposal document",
  "s3_key": "resources/uuid.pdf",
  "file_url": "https://bucket.s3.region.amazonaws.com/...",
  "size": 1024000,
  "tags": ["client", "proposal"]
}
```

#### Delete Resource
**DELETE** `/api/resources?id=resource-uuid`
- **Auth Required:** Yes
- **Description:** Delete resource and associated S3 file

#### Generate Upload URL
**POST** `/api/resources/upload-url`
- **Auth Required:** Yes
- **Description:** Generate presigned URL for direct S3 upload

**Request Body:**
```json
{
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "fileSize": 1024000
}
```

**Response:**
```json
{
  "uploadUrl": "https://bucket.s3.region.amazonaws.com/...",
  "key": "resources/uuid.pdf",
  "publicUrl": "https://bucket.s3.region.amazonaws.com/..."
}
```

### Google Drive Integration

#### Get Authorization URL
**GET** `/api/google/auth`
- **Auth Required:** No
- **Description:** Get Google OAuth authorization URL

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### OAuth Callback
**GET** `/api/google/callback`
- **Auth Required:** No
- **Description:** Handle Google OAuth callback and store tokens
- **Parameters:** `code` (query parameter)

#### Check Connection Status
**GET** `/api/google/status`
- **Auth Required:** Yes
- **Description:** Check Google Drive connection status

#### List Files
**GET** `/api/google/files`
- **Auth Required:** Yes
- **Description:** List files from Google Drive

#### List Folders
**GET** `/api/google/folders`
- **Auth Required:** Yes
- **Description:** List folders from Google Drive

#### Sync Files
**POST** `/api/google/sync`
- **Auth Required:** Yes
- **Description:** Sync selected files from Google Drive to S3

**Request Body:**
```json
{
  "files": [
    {
      "id": "google-file-id",
      "name": "document.pdf",
      "mimeType": "application/pdf",
      "size": "1024000",
      "modifiedTime": "2024-01-01T00:00:00Z"
    }
  ],
  "category": "documents",
  "department": "sales",
  "tags": ["imported"]
}
```

**Response:**
```json
{
  "success": true,
  "syncedCount": 1,
  "errorCount": 0,
  "errors": []
}
```

#### Enhanced Sync
**POST** `/api/google/sync/enhanced`
- **Auth Required:** Yes
- **Description:** Enhanced sync with additional processing

#### Single File Sync
**POST** `/api/google/sync/single`
- **Auth Required:** Yes
- **Description:** Sync a single file from Google Drive

#### Re-sync Files
**POST** `/api/google/sync/re-sync`
- **Auth Required:** Yes
- **Description:** Re-sync previously synced files

#### Check Sync Status
**GET** `/api/google/sync/check`
- **Auth Required:** Yes
- **Description:** Check status of ongoing sync operations

#### Webhook Management
**POST** `/api/google/webhook/register`
- **Auth Required:** Yes
- **Description:** Register webhook for Google Drive notifications

**GET** `/api/google/webhook/status`
- **Auth Required:** Yes
- **Description:** Check webhook registration status

**POST** `/api/google/webhook/callback`
- **Auth Required:** No
- **Description:** Handle Google Drive webhook notifications

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid auth token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (server-side error)

## Rate Limiting

API endpoints may be subject to rate limiting. When rate limited, you'll receive a `429` status code.

## Data Models

### Lead
```typescript
interface Lead {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
  status: 'new' | 'contacted' | 'qualified' | 'unqualified'
  bio_match?: number
  follower_count?: number
  created_at: string
  updated_at: string
}
```

### Deal
```typescript
interface Deal {
  id: string
  title: string
  value: number
  stage: 'contacted' | 'demo' | 'negotiating' | 'proposal' | 'closed-won' | 'closed-lost'
  lead_id: string
  created_at: string
  updated_at: string
  expected_close_date?: string
}
```

### Resource
```typescript
interface Resource {
  id: string
  name: string
  type: 'document' | 'image' | 'video' | 'other'
  category: string
  department: string
  description?: string
  s3_key: string
  file_url: string
  size: number
  tags?: string[]
  upload_date: string
  uploaded_by: string
  google_drive_id?: string
  sync_status?: 'synced' | 'pending' | 'failed'
}
```