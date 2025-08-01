export const AUTH_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES_REP: 'sales-rep',
  VIEWER: 'viewer',
} as const

export type AuthRole = typeof AUTH_ROLES[keyof typeof AUTH_ROLES]

export const ROLE_PERMISSIONS = {
  [AUTH_ROLES.ADMIN]: {
    canManageUsers: true,
    canViewReports: true,
    canManageDeals: true,
    canManageLeads: true,
    canViewPipeline: true,
    canManageResources: true,
    canViewDashboard: true,
    canManageOnboarding: true,
  },
  [AUTH_ROLES.MANAGER]: {
    canManageUsers: false,
    canViewReports: true,
    canManageDeals: true,
    canManageLeads: true,
    canViewPipeline: true,
    canManageResources: true,
    canViewDashboard: true,
    canManageOnboarding: true,
  },
  [AUTH_ROLES.SALES_REP]: {
    canManageUsers: false,
    canViewReports: false,
    canManageDeals: true,
    canManageLeads: true,
    canViewPipeline: true,
    canManageResources: false,
    canViewDashboard: true,
    canManageOnboarding: false,
  },
  [AUTH_ROLES.VIEWER]: {
    canManageUsers: false,
    canViewReports: false,
    canManageDeals: false,
    canManageLeads: false,
    canViewPipeline: true,
    canManageResources: false,
    canViewDashboard: true,
    canManageOnboarding: false,
  },
} as const

export function hasPermission(
  userRoles: string[] | undefined,
  permission: keyof typeof ROLE_PERMISSIONS[AuthRole]
): boolean {
  if (!userRoles || userRoles.length === 0) return false
  
  return userRoles.some(role => {
    const rolePermissions = ROLE_PERMISSIONS[role as AuthRole]
    return rolePermissions?.[permission] || false
  })
}

export function getHighestRole(userRoles: string[] | undefined): AuthRole | null {
  if (!userRoles || userRoles.length === 0) return null
  
  const roleHierarchy = [AUTH_ROLES.ADMIN, AUTH_ROLES.MANAGER, AUTH_ROLES.SALES_REP, AUTH_ROLES.VIEWER]
  
  for (const role of roleHierarchy) {
    if (userRoles.includes(role)) {
      return role
    }
  }
  
  return null
}