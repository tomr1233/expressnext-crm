import { NextRequest, NextResponse } from 'next/server'
import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand,
  AuthFlowType
} from '@aws-sdk/client-cognito-identity-provider'
import CryptoJS from 'crypto-js'

const region = process.env.NEXT_PUBLIC_AWS_REGION
const clientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID
const clientSecret = process.env.COGNITO_CLIENT_SECRET

const cognitoClient = new CognitoIdentityProviderClient({
  region: region || 'us-east-1',
})

function calculateSecretHash(username: string): string | undefined {
  if (!clientSecret || !clientId) return undefined
  
  const message = username + clientId
  const hash = CryptoJS.HmacSHA256(message, clientSecret)
  return CryptoJS.enc.Base64.stringify(hash)
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      )
    }

    const secretHash = calculateSecretHash(email)
    const authParameters: Record<string, string> = {
      USERNAME: email,
      PASSWORD: password,
    }
    
    if (secretHash) {
      authParameters.SECRET_HASH = secretHash
    }

    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: clientId!,
      AuthParameters: authParameters,
    })

    const response = await cognitoClient.send(command)

    if (response.ChallengeName) {
      return NextResponse.json({
        challengeName: response.ChallengeName,
        session: response.Session,
      })
    }

    if (response.AuthenticationResult) {
      const { AccessToken, RefreshToken, IdToken } = response.AuthenticationResult
      
      return NextResponse.json({
        success: true,
        accessToken: AccessToken,
        refreshToken: RefreshToken,
        idToken: IdToken,
      })
    }

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Sign in API error:', error)
    return NextResponse.json(
      { error: error.message || 'Sign in failed' },
      { status: 400 }
    )
  }
}