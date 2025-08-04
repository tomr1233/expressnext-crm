'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { CognitoAuthService, CognitoUser } from '@/lib/cognito'
import { CognitoTokenStorage } from '@/lib/secure-storage'

interface AuthContextType {
  user: CognitoUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<unknown>
  signUp: (email: string, password: string) => Promise<unknown>
  confirmSignUp: (email: string, confirmationCode: string, password: string) => Promise<unknown>
  signOut: () => Promise<void>
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  refresh: () => Promise<void>
  refreshToken: () => Promise<void>
  getTokenExpirationTime: () => number | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CognitoUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const currentUser = await CognitoAuthService.getCurrentUser()
      setUser(currentUser)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  // Smart token refresh: check token expiration and refresh before it expires
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      try {
        if (typeof window === 'undefined') return

        const accessToken = CognitoTokenStorage.getAccessToken()
        const refreshToken = CognitoTokenStorage.getRefreshToken()
        
        if (!accessToken || !refreshToken) return

        // Check if token will expire within 10 minutes using our secure storage utility
        const timeToExpiration = CognitoTokenStorage.getAccessTokenTimeToExpiration()
        
        if (timeToExpiration !== null && timeToExpiration <= 10) {
          console.log(`Token expires in ${timeToExpiration} minutes, refreshing...`)
          const refreshedUser = await CognitoAuthService.refreshUserToken()
          if (refreshedUser) {
            setUser(refreshedUser)
            console.log('Token refreshed successfully')
          } else {
            console.log('Token refresh failed, signing out user')
            await signOut()
          }
        }
      } catch (error) {
        console.error('Token check failed:', error)
      }
    }

    // Check token status every 5 minutes
    const tokenCheckInterval = setInterval(checkAndRefreshToken, 5 * 60 * 1000)
    
    // Also check immediately after a delay to ensure token is valid
    const refreshTimeout = setTimeout(checkAndRefreshToken, 1000)

    return () => {
      clearInterval(tokenCheckInterval)
      clearTimeout(refreshTimeout)
    }
  }, [user]) // Re-run when user changes

  const signIn = async (email: string, password: string) => {
    try {
      const result = await CognitoAuthService.signIn(email, password)
      if (result.user) {
        setUser(result.user)
      }
      return result
    } catch (error) {
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const result = await CognitoAuthService.signUp(email, password)
      return result
    } catch (error) {
      throw error
    }
  }

  const confirmSignUp = async (email: string, confirmationCode: string, password: string) => {
    try {
      const result = await CognitoAuthService.confirmSignUp(email, confirmationCode, password)
      // If the user was automatically signed in, update the context
      if (result.user) {
        setUser(result.user)
      }
      return result
    } catch (error) {
      throw error
    }
  }

  const signOut = async () => {
    try {
      await CognitoAuthService.signOut()
      setUser(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const hasRole = (role: string) => {
    return CognitoAuthService.hasRole(user, role)
  }

  const hasAnyRole = (roles: string[]) => {
    return CognitoAuthService.hasAnyRole(user, roles)
  }

  const refreshToken = async () => {
    try {
      const refreshedUser = await CognitoAuthService.refreshUserToken()
      if (refreshedUser) {
        setUser(refreshedUser)
      }
    } catch (error) {
      console.error('Token refresh error:', error)
    }
  }

  const getTokenExpirationTime = () => {
    return CognitoTokenStorage.getAccessTokenTimeToExpiration()
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    confirmSignUp,
    signOut,
    hasRole,
    hasAnyRole,
    refresh,
    refreshToken,
    getTokenExpirationTime,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}