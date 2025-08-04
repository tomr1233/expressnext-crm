import { NextRequest, NextResponse } from 'next/server'
import { 
  CognitoIdentityProviderClient, 
  ConfirmSignUpCommand,
  ConfirmSignUpCommandInput,
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
    const { email, password, confirmationCode } = await request.json()

    if (!email || !confirmationCode || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const secretHash = calculateSecretHash(email)

    // First, confirm the sign up
    const confirmInput: ConfirmSignUpCommandInput = {
      ClientId: clientId!,
      Username: email,
      ConfirmationCode: confirmationCode,
    }

    if (secretHash) {
      confirmInput.SecretHash = secretHash
    }

    const confirmCommand = new ConfirmSignUpCommand(confirmInput)
    await cognitoClient.send(confirmCommand)

    // Then automatically sign in the user
    const authParameters: Record<string, string> = {
      USERNAME: email,
      PASSWORD: password,
    }
    
    if (secretHash) {
      authParameters.SECRET_HASH = secretHash
    }

    const loginCommand = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: clientId!,
      AuthParameters: authParameters,
    })

    const loginResponse = await cognitoClient.send(loginCommand)

    if (loginResponse.ChallengeName) {
      return NextResponse.json({
        success: true,
        confirmed: true,
        challengeName: loginResponse.ChallengeName,
        session: loginResponse.Session,
      })
    }

    if (loginResponse.AuthenticationResult) {
      const { AccessToken, RefreshToken, IdToken } = loginResponse.AuthenticationResult
      
      return NextResponse.json({
        success: true,
        confirmed: true,
        signedIn: true,
        accessToken: AccessToken,
        refreshToken: RefreshToken,
        idToken: IdToken,
      })
    }

    // If login failed for some reason, still return success for confirmation
    return NextResponse.json({
      success: true,
      confirmed: true,
      signedIn: false,
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Confirmation failed'
    console.error('Confirm and login API error:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}