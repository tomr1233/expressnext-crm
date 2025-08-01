import { NextRequest, NextResponse } from 'next/server'
import { 
  CognitoIdentityProviderClient, 
  ConfirmSignUpCommand
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
    const { username, confirmationCode } = await request.json()

    if (!username || !confirmationCode) {
      return NextResponse.json(
        { error: 'Missing username or confirmation code' },
        { status: 400 }
      )
    }

    const secretHash = calculateSecretHash(username)
    const commandInput: any = {
      ClientId: clientId!,
      Username: username,
      ConfirmationCode: confirmationCode,
    }

    if (secretHash) {
      commandInput.SecretHash = secretHash
    }

    const command = new ConfirmSignUpCommand(commandInput)
    const response = await cognitoClient.send(command)
    
    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Confirm sign up API error:', error)
    return NextResponse.json(
      { error: error.message || 'Confirmation failed' },
      { status: 400 }
    )
  }
}