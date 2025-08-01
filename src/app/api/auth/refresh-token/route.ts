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
    const { refreshToken, email } = await request.json()

    if (!refreshToken || !email) {
      return NextResponse.json(
        { error: 'Missing refresh token or email' },
        { status: 400 }
      )
    }

    const secretHash = calculateSecretHash(email)
    const authParameters: Record<string, string> = {
      REFRESH_TOKEN: refreshToken,
    }
    
    if (secretHash) {
      authParameters.SECRET_HASH = secretHash
    }

    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      ClientId: clientId!,
      AuthParameters: authParameters,
    })

    const response = await cognitoClient.send(command)

    if (response.AuthenticationResult) {
      const { AccessToken, IdToken } = response.AuthenticationResult
      
      return NextResponse.json({
        success: true,
        accessToken: AccessToken,
        idToken: IdToken,
        // Refresh token usually stays the same unless rotation is enabled
        refreshToken: response.AuthenticationResult.RefreshToken || refreshToken,
      })
    }

    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Refresh token API error:', error)
    return NextResponse.json(
      { error: error.message || 'Token refresh failed' },
      { status: 400 }
    )
  }
}