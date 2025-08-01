import { 
  CognitoIdentityProviderClient, 
  GetUserCommand,
  GlobalSignOutCommand
} from '@aws-sdk/client-cognito-identity-provider'

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

const isCognitoConfigured = () => {
  return !!(userPoolId && clientId && region)
}

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

        // Store tokens in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('cognito_access_token', data.accessToken)
          if (data.refreshToken) localStorage.setItem('cognito_refresh_token', data.refreshToken)
          if (data.idToken) localStorage.setItem('cognito_id_token', data.idToken)
        }

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

        // Store tokens in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('cognito_access_token', data.accessToken)
          if (data.refreshToken) localStorage.setItem('cognito_refresh_token', data.refreshToken)
          if (data.idToken) localStorage.setItem('cognito_id_token', data.idToken)
        }

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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cognito_access_token')
        localStorage.removeItem('cognito_refresh_token')
        localStorage.removeItem('cognito_id_token')
      }
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
      const accessToken = typeof window !== 'undefined' 
        ? localStorage.getItem('cognito_access_token') 
        : null

      if (!accessToken) {
        return null
      }

      const command = new GetUserCommand({
        AccessToken: accessToken,
      })

      const response = await cognitoClient.send(command)
      
      if (response.Username) {
        const tokenPayload = parseJwtToken(accessToken)
        const groups = tokenPayload?.['cognito:groups'] || []
        
        const emailAttribute = response.UserAttributes?.find(attr => attr.Name === 'email')
        
        return {
          userId: response.Username,
          username: response.Username,
          email: emailAttribute?.Value,
          groups,
          accessToken,
        }
      }

      return null
    } catch (error) {
      console.error('Get current user error:', error)
      // Clear invalid token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cognito_access_token')
        localStorage.removeItem('cognito_refresh_token')
        localStorage.removeItem('cognito_id_token')
      }
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
      if (typeof window !== 'undefined') {
        return {
          accessToken: localStorage.getItem('cognito_access_token'),
          refreshToken: localStorage.getItem('cognito_refresh_token'),
          idToken: localStorage.getItem('cognito_id_token'),
        }
      }
      return null
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

    try {
      const refreshToken = typeof window !== 'undefined' 
        ? localStorage.getItem('cognito_refresh_token') 
        : null
      
      const currentUser = await this.getCurrentUser()
      
      if (!refreshToken || !currentUser?.email) {
        return null
      }

      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          refreshToken, 
          email: currentUser.email 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Token refresh failed')
      }

      if (data.success && data.accessToken) {
        const tokenPayload = parseJwtToken(data.accessToken)
        const groups = tokenPayload?.['cognito:groups'] || []
        
        const refreshedUser: CognitoUser = {
          userId: tokenPayload?.sub || currentUser.userId,
          username: tokenPayload?.username || currentUser.username,
          email: tokenPayload?.email || currentUser.email,
          groups,
          accessToken: data.accessToken,
        }

        // Update stored tokens
        if (typeof window !== 'undefined') {
          localStorage.setItem('cognito_access_token', data.accessToken)
          if (data.refreshToken) localStorage.setItem('cognito_refresh_token', data.refreshToken)
          if (data.idToken) localStorage.setItem('cognito_id_token', data.idToken)
        }

        return refreshedUser
      }

      return null
    } catch (error) {
      console.error('Refresh token error:', error)
      return null
    }
  }
}