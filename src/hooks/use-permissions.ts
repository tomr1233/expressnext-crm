import { useAuth } from '@/contexts/auth-context'
import { hasPermission, ROLE_PERMISSIONS, AuthRole } from '@/lib/auth-roles'

export function usePermissions() {
  const { user } = useAuth()
  
  const checkPermission = (permission: keyof typeof ROLE_PERMISSIONS[AuthRole]) => {
    return hasPermission(user?.groups, permission)
  }
  
  return {
    canManageUsers: checkPermission('canManageUsers'),
    canViewReports: checkPermission('canViewReports'),
    canManageDeals: checkPermission('canManageDeals'),
    canManageLeads: checkPermission('canManageLeads'),
    canViewPipeline: checkPermission('canViewPipeline'),
    canManageResources: checkPermission('canManageResources'),
    canViewDashboard: checkPermission('canViewDashboard'),
    canManageOnboarding: checkPermission('canManageOnboarding'),
    checkPermission,
  }
}