import React from 'react';
import { useAuthStore } from '@pulse/core-logic';
import { ShieldX } from 'lucide-react';
import { usePermission } from '../hooks/usePermission';

interface RequirePermissionProps {
  permission: string | string[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, ANY permission is enough.
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showAccessDenied?: boolean;
}

/**
 * Wrapper component that renders children only if user has the required permission(s).
 * 
 * @example
 * // Single permission
 * <RequirePermission permission="pos.refund">
 *   <RefundButton />
 * </RequirePermission>
 * 
 * @example
 * // Multiple permissions (ANY)
 * <RequirePermission permission={['pos.refund', 'pos.void']}>
 *   <AdminActions />
 * </RequirePermission>
 * 
 * @example
 * // Multiple permissions (ALL required)
 * <RequirePermission permission={['inventory.view', 'inventory.edit']} requireAll>
 *   <InventoryEditor />
 * </RequirePermission>
 */
export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  requireAll = false,
  children,
  fallback = null,
  showAccessDenied = false,
}) => {
  const { hasPermission, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const hasAccess = requireAll
    ? permissions.every(p => hasPermission(p))
    : permissions.some(p => hasPermission(p));

  if (hasAccess) {
    return <>{children}</>;
  }

  if (showAccessDenied) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ShieldX className="w-16 h-16 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600 dark:text-slate-400 text-sm max-w-xs">
          You don't have permission to access this feature. Contact your administrator for access.
        </p>
      </div>
    );
  }

  return <>{fallback}</>;
};

/**
 * Permission-aware button that disables itself when user lacks permission
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string;
  children: React.ReactNode;
  disabledMessage?: string;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  children,
  disabledMessage = 'You do not have permission to perform this action',
  disabled,
  className,
  ...props
}) => {
  const hasAccess = usePermission(permission);
  const isDisabled = disabled || !hasAccess;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`${className} ${!hasAccess ? 'cursor-not-allowed opacity-50' : ''}`}
      title={!hasAccess ? disabledMessage : undefined}
    >
      {children}
    </button>
  );
};
