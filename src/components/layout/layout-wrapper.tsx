'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface LayoutWrapperProps {
  children: React.ReactNode
}

const AUTH_ROUTES = ['/auth', '/unauthorized']

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    )
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