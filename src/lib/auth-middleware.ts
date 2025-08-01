import { NextRequest, NextResponse } from 'next/server'
import { 
  CognitoIdentityProviderClient, 
  GetUserCommand
} from '@aws-sdk/client-cognito-identity-provider'

const region = process.env.NEXT_PUBLIC_AWS_REGION
const cognitoClient = new CognitoIdentityProviderClient({
  region: region || 'us-east-1',
})

export interface AuthenticatedUser {
  userId: string
  username: string
  email?: string
  groups?: string[]
}

function parseJwtToken(token: string) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error parsing JWT token:', error)
    return null
  }
}

export async function verifyAuthToken(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    if (!token) {
      return null
    }

    const command = new GetUserCommand({
      AccessToken: token,
    })

    const response = await cognitoClient.send(command)
    
    if (response.Username) {
      const tokenPayload = parseJwtToken(token)
      const groups = tokenPayload?.['cognito:groups'] || []
      
      const emailAttribute = response.UserAttributes?.find(attr => attr.Name === 'email')
      
      return {
        userId: response.Username,
        username: response.Username,
        email: emailAttribute?.Value,
        groups,
      }
    }

    return null
  } catch (error) {
    console.error('Auth verification error:', error)
    return null
  }
}

export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const user = await verifyAuthToken(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      )
    }

    return handler(request, user, ...args)
  }
}

export function withOptionalAuth<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser | null, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const user = await verifyAuthToken(request)
    return handler(request, user, ...args)
  }
}