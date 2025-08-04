import { 
  CognitoIdentityProviderClient, 
  GetUserCommand,
  GlobalSignOutCommand
} from '@aws-sdk/client-cognito-identity-provider'
import { CognitoTokenStorage } from './secure-storage'

const region = process.env.NEXT_PUBLIC_AWS_REGION
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
const clientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID

const cognitoClient = new CognitoIdentityProviderClient({
  region: region || 'us-east-1',
})

export interface CognitoUser {
  userId: string
  username: string
  email?: string
  groups?: string[]
  accessToken?: string
}

export interface AuthResult {
  user?: CognitoUser
  challengeName?: string
  session?: string
  accessToken?: string
  refreshToken?: string
  idToken?: string
}

// Parse JWT token to extract user info
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

// Check if token is expired or will expire soon (within 5 minutes)
function isTokenExpiringSoon(token: string, bufferMinutes: number = 5): boolean {
  try {
    const payload = parseJwtToken(token)
    if (!payload || !payload.exp) return true
    
    const expirationTime = payload.exp * 1000 // Convert to milliseconds
    const currentTime = Date.now()
    const bufferTime = bufferMinutes * 60 * 1000 // Convert minutes to milliseconds
    
    return (expirationTime - currentTime) <= bufferTime
  } catch (error) {
    console.error('Error checking token expiration:', error)
    return true
  }
}

const isCognitoConfigured = () => {
  return !!(userPoolId && clientId && region)
}

// Prevent multiple concurrent refresh attempts
let refreshPromise: Promise<CognitoUser | null> | null = null

export class CognitoAuthService {
  static async signIn(email: string, password: string): Promise<AuthResult> {
    if (!isCognitoConfigured()) {
      throw new Error('Cognito is not configured. Please set up your environment variables.')
    }

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sign in failed')
      }

      if (data.challengeName) {
        return {
          challengeName: data.challengeName,
          session: data.session,
        }
      }

      if (data.success && data.accessToken) {
        const tokenPayload = parseJwtToken(data.accessToken)
        const groups = tokenPayload?.['cognito:groups'] || []
        
        const user: CognitoUser = {
          userId: tokenPayload?.sub || '',
          username: tokenPayload?.username || email,
          email: tokenPayload?.email || email,
          groups,
          accessToken: data.accessToken,
        }

        // Store tokens securely
        CognitoTokenStorage.setTokens(data.accessToken, data.refreshToken, data.idToken)

        return {
          user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          idToken: data.idToken,
        }
      }

      throw new Error('Authentication failed')
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  static async signUp(email: string, password: string) {
    if (!isCognitoConfigured()) {
      throw new Error('Cognito is not configured. Please set up your environment variables.')
    }

    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed')
      }

      return data
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  static async confirmSignUp(email: string, confirmationCode: string, password: string) {
    if (!isCognitoConfigured()) {
      throw new Error('Cognito is not configured. Please set up your environment variables.')
    }

    try {
      const response = await fetch('/api/auth/confirm-and-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, confirmationCode, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Confirmation failed')
      }

      // If the user was successfully signed in after confirmation
      if (data.signedIn && data.accessToken) {
        const tokenPayload = parseJwtToken(data.accessToken)
        const groups = tokenPayload?.['cognito:groups'] || []
        
        const user: CognitoUser = {
          userId: tokenPayload?.sub || '',
          username: tokenPayload?.username || email,
          email: tokenPayload?.email || email,
          groups,
          accessToken: data.accessToken,
        }

        // Store tokens securely
        CognitoTokenStorage.setTokens(data.accessToken, data.refreshToken, data.idToken)

        return {
          ...data,
          user,
        }
      }

      return data
    } catch (error) {
      console.error('Confirm sign up error:', error)
      throw error
    }
  }

  // Keep the old method for backwards compatibility if needed
  static async confirmSignUpOnly(email: string, confirmationCode: string) {
    if (!isCognitoConfigured()) {
      throw new Error('Cognito is not configured. Please set up your environment variables.')
    }

    try {
      const response = await fetch('/api/auth/confirm-sign-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: email, confirmationCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Confirmation failed')
      }

      return data
    } catch (error) {
      console.error('Confirm sign up error:', error)
      throw error
    }
  }

  static async signOut() {
    if (!isCognitoConfigured()) {
      throw new Error('Cognito is not configured. Please set up your environment variables.')
    }

    try {
      const accessToken = typeof window !== 'undefined' 
        ? localStorage.getItem('cognito_access_token') 
        : null

      if (accessToken) {
        const command = new GlobalSignOutCommand({
          AccessToken: accessToken,
        })
        await cognitoClient.send(command)
      }

      // Clear stored tokens
      CognitoTokenStorage.clearTokens()
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  static async getCurrentUser(): Promise<CognitoUser | null> {
    if (!isCognitoConfigured()) {
      return null
    }

    try {
      const accessToken = CognitoTokenStorage.getAccessToken()

      if (!accessToken) {
        return null
      }

      // Check if token is expired or expiring soon
      if (isTokenExpiringSoon(accessToken, 10)) {
        console.log('Access token is expiring soon, attempting refresh...')
        const refreshedUser = await this.refreshUserToken()
        if (refreshedUser) {
          return refreshedUser
        }
        // If refresh fails, fall through to try with current token
      }

      const command = new GetUserCommand({
        AccessToken: CognitoTokenStorage.getAccessToken() || accessToken,
      })

      const response = await cognitoClient.send(command)
      
      if (response.Username) {
        const currentAccessToken = CognitoTokenStorage.getAccessToken() || accessToken
        const tokenPayload = parseJwtToken(currentAccessToken)
        const groups = tokenPayload?.['cognito:groups'] || []
        
        const emailAttribute = response.UserAttributes?.find(attr => attr.Name === 'email')
        
        return {
          userId: response.Username,
          username: response.Username,
          email: emailAttribute?.Value,
          groups,
          accessToken: currentAccessToken,
        }
      }

      return null
    } catch (error: unknown) {
      console.error('Get current user error:', error)
      
      // If token is expired, try to refresh
      if ((error as Error & { name?: string }).name === 'NotAuthorizedException' || (error as Error).message?.includes('Access Token has expired')) {
        console.log('Access token expired, attempting refresh...')
        try {
          const refreshedUser = await this.refreshUserToken()
          if (refreshedUser) {
            return refreshedUser
          }
        } catch (refreshError) {
          console.error('Token refresh failed after expiration:', refreshError)
        }
      }
      
      // Clear invalid tokens
      CognitoTokenStorage.clearTokens()
      return null
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    if (!isCognitoConfigured()) {
      return false
    }

    try {
      const user = await this.getCurrentUser()
      return !!user
    } catch {
      return false
    }
  }

  static async getAuthSession() {
    if (!isCognitoConfigured()) {
      return null
    }

    try {
      return CognitoTokenStorage.getTokens()
    } catch (error) {
      console.error('Get auth session error:', error)
      return null
    }
  }

  static hasRole(user: CognitoUser | null, role: string): boolean {
    return user?.groups?.includes(role) || false
  }

  static hasAnyRole(user: CognitoUser | null, roles: string[]): boolean {
    if (!user?.groups) return false
    return roles.some(role => user.groups!.includes(role))
  }

  static async refreshUserToken(): Promise<CognitoUser | null> {
    if (!isCognitoConfigured()) {
      return null
    }

    // If a refresh is already in progress, return the existing promise
    if (refreshPromise) {
      return refreshPromise
    }

    refreshPromise = this._performTokenRefresh()
    
    try {
      const result = await refreshPromise
      return result
    } finally {
      refreshPromise = null
    }
  }

  private static async _performTokenRefresh(): Promise<CognitoUser | null> {
    try {
      const refreshToken = CognitoTokenStorage.getRefreshToken()
      const accessToken = CognitoTokenStorage.getAccessToken()

      if (!refreshToken) {
        console.log('No refresh token available')
        return null
      }

      let currentEmail: string | undefined
      if (accessToken) {
        const tokenPayload = parseJwtToken(accessToken)
        currentEmail = tokenPayload?.email
      }

      if (!currentEmail) {
        console.log('No email found in token payload')
        return null
      }

      console.log('Attempting token refresh for user:', currentEmail)

      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          refreshToken, 
          email: currentEmail 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Token refresh API error:', data.error)
        
        // If refresh token is invalid, clear all tokens
        if (data.error?.includes('Refresh Token has expired') || 
            data.error?.includes('Refresh token is not valid') ||
            response.status === 400) {
          console.log('Refresh token expired or invalid, clearing tokens')
          CognitoTokenStorage.clearTokens()
        }
        
        throw new Error(data.error || 'Token refresh failed')
      }

      if (data.success && data.accessToken) {
        const newTokenPayload = parseJwtToken(data.accessToken)
        const groups = newTokenPayload?.['cognito:groups'] || []
        
        const refreshedUser: CognitoUser = {
          userId: newTokenPayload?.sub || '',
          username: newTokenPayload?.username || currentEmail,
          email: newTokenPayload?.email || currentEmail,
          groups,
          accessToken: data.accessToken,
        }

        // Update stored tokens
        CognitoTokenStorage.setTokens(data.accessToken, data.refreshToken, data.idToken)

        console.log('Token refresh successful')
        return refreshedUser
      }

      console.log('Token refresh failed: no access token in response')
      return null
    } catch (error: unknown) {
      console.error('Refresh token error:', error)
      
      // If refresh token is expired or invalid, clear all tokens
      if ((error as Error).message?.includes('Refresh Token has expired') || 
          (error as Error).message?.includes('Refresh token is not valid')) {
        console.log('Clearing expired refresh token')
        CognitoTokenStorage.clearTokens()
      }
      
      return null
    }
  }
}