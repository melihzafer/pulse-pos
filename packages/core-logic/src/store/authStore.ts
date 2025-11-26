import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Cashier, db, LocalUser, LocalRole } from '../database';
import { AuthService } from '../services/AuthService';
import type { User, Role } from '../types';

interface AuthState {
  // New user system
  currentUser: User | null;
  currentRole: Role | null;
  permissions: string[];
  
  // Legacy cashier support (deprecated, for backward compatibility)
  currentCashier: Cashier | null;
  isAuthenticated: boolean;
  
  // Session management
  sessionStartTime: string | null;
  lastActivityTime: string | null;
  
  // Actions
  login: (username: string, pinCode: string) => Promise<boolean>;
  loginWithPassword: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  getCurrentCashier: () => Cashier | null;
  hasPermission: (permissionKey: string) => boolean;
  refreshPermissions: () => Promise<void>;
  updateLastActivity: () => void;
  
  // Session timeout check
  isSessionValid: (timeoutMinutes?: number) => boolean;
}

const DEFAULT_WORKSPACE_ID = 'default-workspace';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      currentRole: null,
      permissions: [],
      currentCashier: null,
      isAuthenticated: false,
      sessionStartTime: null,
      lastActivityTime: null,

      login: async (username: string, pinCode: string) => {
        try {
          console.log('🔐 Attempting login:', { username, pinLength: pinCode.length });
          
          // Initialize auth system if not done
          await AuthService.initializeAuth(DEFAULT_WORKSPACE_ID);
          
          // First try new User system with PIN
          const user = await AuthService.loginWithPin(pinCode, DEFAULT_WORKSPACE_ID);
          
          if (user && user.username.toLowerCase() === username.toLowerCase()) {
            const role = await AuthService.getUserRole(user.role_id);
            const permissions = role?.permissions || [];
            
            const now = new Date().toISOString();
            set({
              currentUser: user,
              currentRole: role,
              permissions,
              currentCashier: null,
              isAuthenticated: true,
              sessionStartTime: now,
              lastActivityTime: now,
            });
            
            console.log('✅ User logged in (new system):', user.username);
            return true;
          }
          
          // Fallback to legacy Cashier system for backward compatibility
          try {
            const dbExists = await db.open();
            console.log('✅ Database opened successfully:', dbExists.name);
          } catch (dbError) {
            console.error('❌ Database open failed:', dbError);
            return false;
          }
          
          const allCashiers = await db.cashiers.toArray();
          console.log('👥 Total cashiers in DB:', allCashiers.length);
          
          const cashier = allCashiers.find(c => 
            c.username.toLowerCase() === username.toLowerCase() &&
            c.pin_code === pinCode &&
            c.is_active &&
            !c._deleted
          );

          console.log('✅ Cashier found:', cashier ? cashier.username : 'None');

          if (cashier) {
            // Map legacy cashier role to permissions
            const legacyPermissions = getLegacyPermissions(cashier.role);
            const now = new Date().toISOString();
            
            set({
              currentUser: null,
              currentRole: null,
              permissions: legacyPermissions,
              currentCashier: cashier,
              isAuthenticated: true,
              sessionStartTime: now,
              lastActivityTime: now,
            });
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('❌ Login error:', error);
          return false;
        }
      },

      loginWithPassword: async (username: string, password: string) => {
        try {
          console.log('🔐 Attempting password login:', { username });
          
          // Initialize auth system if not done
          await AuthService.initializeAuth(DEFAULT_WORKSPACE_ID);
          
          const user = await AuthService.loginWithPassword(username, password);
          
          if (user) {
            const role = await AuthService.getUserRole(user.role_id);
            const permissions = role?.permissions || [];
            
            const now = new Date().toISOString();
            set({
              currentUser: user,
              currentRole: role,
              permissions,
              currentCashier: null,
              isAuthenticated: true,
              sessionStartTime: now,
              lastActivityTime: now,
            });
            
            console.log('✅ User logged in with password:', user.username);
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('❌ Password login error:', error);
          return false;
        }
      },

      logout: () => {
        const state = get();
        
        // Log the logout activity
        if (state.currentUser) {
          AuthService.logActivity(
            state.currentUser.workspace_id,
            state.currentUser.id,
            'logout',
            'user',
            state.currentUser.id,
            'User logged out'
          ).catch(console.error);
        }
        
        set({
          currentUser: null,
          currentRole: null,
          permissions: [],
          currentCashier: null,
          isAuthenticated: false,
          sessionStartTime: null,
          lastActivityTime: null,
        });
      },

      getCurrentCashier: () => {
        return get().currentCashier;
      },

      hasPermission: (permissionKey: string) => {
        const { permissions, currentRole } = get();
        
        // Admin has all permissions
        if (currentRole?.name === 'Admin') return true;
        
        return permissions.includes(permissionKey);
      },

      refreshPermissions: async () => {
        const { currentUser } = get();
        if (!currentUser) return;
        
        const role = await AuthService.getUserRole(currentUser.role_id);
        const permissions = role?.permissions || [];
        
        set({ currentRole: role, permissions });
      },

      updateLastActivity: () => {
        set({ lastActivityTime: new Date().toISOString() });
      },

      isSessionValid: (timeoutMinutes = 30) => {
        const { lastActivityTime, isAuthenticated } = get();
        if (!isAuthenticated || !lastActivityTime) return false;
        
        const lastActivity = new Date(lastActivityTime);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
        
        return diffMinutes < timeoutMinutes;
      },
    }),
    {
      name: 'pulse-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        currentRole: state.currentRole,
        permissions: state.permissions,
        currentCashier: state.currentCashier,
        isAuthenticated: state.isAuthenticated,
        sessionStartTime: state.sessionStartTime,
        lastActivityTime: state.lastActivityTime,
      }),
    }
  )
);

// Map legacy cashier roles to permission sets
function getLegacyPermissions(role: 'admin' | 'manager' | 'cashier'): string[] {
  switch (role) {
    case 'admin':
      return [
        'pos.sell', 'pos.refund', 'pos.void', 'pos.discount', 'pos.price_override', 'pos.open_drawer', 'pos.park_sale',
        'inventory.view', 'inventory.edit', 'inventory.create', 'inventory.delete', 'inventory.adjust',
        'reports.view', 'reports.export', 'reports.analytics',
        'settings.general', 'settings.users', 'settings.roles', 'settings.system',
        'customers.view', 'customers.edit', 'customers.delete', 'customers.credit',
        'employees.view', 'employees.manage', 'employees.timeclock', 'employees.approve_time',
        'suppliers.view', 'suppliers.manage', 'suppliers.orders',
        'locations.view', 'locations.manage', 'locations.transfer',
      ];
    case 'manager':
      return [
        'pos.sell', 'pos.refund', 'pos.void', 'pos.discount', 'pos.price_override', 'pos.open_drawer', 'pos.park_sale',
        'inventory.view', 'inventory.edit', 'inventory.create', 'inventory.adjust',
        'reports.view', 'reports.export', 'reports.analytics',
        'settings.general',
        'customers.view', 'customers.edit', 'customers.credit',
        'employees.view', 'employees.timeclock', 'employees.approve_time',
        'suppliers.view', 'suppliers.manage', 'suppliers.orders',
        'locations.view', 'locations.transfer',
      ];
    case 'cashier':
    default:
      return [
        'pos.sell', 'pos.park_sale',
        'inventory.view',
        'customers.view', 'customers.edit',
      ];
  }
}

