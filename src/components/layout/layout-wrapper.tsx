'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { useAuth } from '@/contexts/auth-context'

interface LayoutWrapperProps {
  children: React.ReactNode
}

const AUTH_ROUTES = ['/auth', '/unauthorized']

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  useEffect(() => {
    if (!loading && !user && !isAuthRoute) {
      router.push('/auth')
    }
  }, [user, loading, isAuthRoute, router])

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    )
  }

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render protected content for unauthenticated users
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}