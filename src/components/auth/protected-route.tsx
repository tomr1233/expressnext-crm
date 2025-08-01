'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
  fallbackPath?: string
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallbackPath = '/auth' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(fallbackPath)
        return
      }

      if (requiredRoles.length > 0) {
        const userGroups = user.groups || []
        const hasRequiredRole = requiredRoles.some(role => userGroups.includes(role))
        
        if (!hasRequiredRole) {
          router.push('/unauthorized')
          return
        }
      }
    }
  }, [user, loading, router, requiredRoles, fallbackPath])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requiredRoles.length > 0) {
    const userGroups = user.groups || []
    const hasRequiredRole = requiredRoles.some(role => userGroups.includes(role))
    
    if (!hasRequiredRole) {
      return null
    }
  }

  return <>{children}</>
}