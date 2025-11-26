import { useAuthStore } from '@pulse/core-logic';

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permission: string): boolean {
  const { hasPermission, isAuthenticated } = useAuthStore();
  return isAuthenticated && hasPermission(permission);
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useAnyPermission(permissions: string[]): boolean {
  const { hasPermission, isAuthenticated } = useAuthStore();
  return isAuthenticated && permissions.some(p => hasPermission(p));
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useAllPermissions(permissions: string[]): boolean {
  const { hasPermission, isAuthenticated } = useAuthStore();
  return isAuthenticated && permissions.every(p => hasPermission(p));
}
