import { NextRequest, NextResponse } from 'next/server'
import { 
  CognitoIdentityProviderClient, 
  SignUpCommand
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
    const userAttributes = [
      {
        Name: 'email',
        Value: email,
      },
    ]

    const commandInput: any = {
      ClientId: clientId!,
      Username: email, // Use email as username
      Password: password,
      UserAttributes: userAttributes,
    }

    if (secretHash) {
      commandInput.SecretHash = secretHash
    }

    const command = new SignUpCommand(commandInput)
    const response = await cognitoClient.send(command)
    
    return NextResponse.json({
      success: true,
      userSub: response.UserSub,
      codeDeliveryDetails: response.CodeDeliveryDetails,
    })
  } catch (error: any) {
    console.error('Sign up API error:', error)
    return NextResponse.json(
      { error: error.message || 'Sign up failed' },
      { status: 400 }
    )
  }
}