import { db, LocalUser, LocalRole, LocalActivityLog } from '../database/dexieDb';
import type { User, Role, Permission, ActivityLogAction } from '../types';

// Default permissions for the system
export const DEFAULT_PERMISSIONS: Permission[] = [
  // POS permissions
  { id: 'perm-001', key: 'pos.sell', name: 'Process Sales', description: 'Can process sales transactions', category: 'pos' },
  { id: 'perm-002', key: 'pos.refund', name: 'Process Refunds', description: 'Can process refunds', category: 'pos' },
  { id: 'perm-003', key: 'pos.void', name: 'Void Transactions', description: 'Can void transactions', category: 'pos' },
  { id: 'perm-004', key: 'pos.discount', name: 'Apply Discounts', description: 'Can apply discounts to sales', category: 'pos' },
  { id: 'perm-005', key: 'pos.price_override', name: 'Override Prices', description: 'Can override product prices', category: 'pos' },
  { id: 'perm-006', key: 'pos.open_drawer', name: 'Open Cash Drawer', description: 'Can open cash drawer without sale', category: 'pos' },
  { id: 'perm-007', key: 'pos.park_sale', name: 'Park Sales', description: 'Can park sales for later', category: 'pos' },
  
  // Inventory permissions
  { id: 'perm-010', key: 'inventory.view', name: 'View Inventory', description: 'Can view inventory', category: 'inventory' },
  { id: 'perm-011', key: 'inventory.edit', name: 'Edit Products', description: 'Can edit product details', category: 'inventory' },
  { id: 'perm-012', key: 'inventory.create', name: 'Create Products', description: 'Can create new products', category: 'inventory' },
  { id: 'perm-013', key: 'inventory.delete', name: 'Delete Products', description: 'Can delete products', category: 'inventory' },
  { id: 'perm-014', key: 'inventory.adjust', name: 'Adjust Stock', description: 'Can adjust stock levels', category: 'inventory' },
  
  // Reports permissions
  { id: 'perm-020', key: 'reports.view', name: 'View Reports', description: 'Can view reports', category: 'reports' },
  { id: 'perm-021', key: 'reports.export', name: 'Export Reports', description: 'Can export reports', category: 'reports' },
  { id: 'perm-022', key: 'reports.analytics', name: 'View Analytics', description: 'Can view analytics dashboard', category: 'reports' },
  
  // Settings permissions
  { id: 'perm-030', key: 'settings.general', name: 'General Settings', description: 'Can modify general settings', category: 'settings' },
  { id: 'perm-031', key: 'settings.users', name: 'User Management', description: 'Can manage users', category: 'settings' },
  { id: 'perm-032', key: 'settings.roles', name: 'Role Management', description: 'Can manage roles', category: 'settings' },
  { id: 'perm-033', key: 'settings.system', name: 'System Settings', description: 'Can modify system settings', category: 'settings' },
  
  // Customer permissions
  { id: 'perm-040', key: 'customers.view', name: 'View Customers', description: 'Can view customer list', category: 'customers' },
  { id: 'perm-041', key: 'customers.edit', name: 'Edit Customers', description: 'Can edit customer details', category: 'customers' },
  { id: 'perm-042', key: 'customers.delete', name: 'Delete Customers', description: 'Can delete customers', category: 'customers' },
  { id: 'perm-043', key: 'customers.credit', name: 'Manage Store Credit', description: 'Can issue/manage store credit', category: 'customers' },
  
  // Employee permissions
  { id: 'perm-050', key: 'employees.view', name: 'View Employees', description: 'Can view employee list', category: 'employees' },
  { id: 'perm-051', key: 'employees.manage', name: 'Manage Employees', description: 'Can manage employees', category: 'employees' },
  { id: 'perm-052', key: 'employees.timeclock', name: 'View Time Clock', description: 'Can view time clock entries', category: 'employees' },
  { id: 'perm-053', key: 'employees.approve_time', name: 'Approve Time', description: 'Can approve time clock entries', category: 'employees' },
  
  // Supplier permissions
  { id: 'perm-060', key: 'suppliers.view', name: 'View Suppliers', description: 'Can view suppliers', category: 'suppliers' },
  { id: 'perm-061', key: 'suppliers.manage', name: 'Manage Suppliers', description: 'Can manage suppliers', category: 'suppliers' },
  { id: 'perm-062', key: 'suppliers.orders', name: 'Manage Purchase Orders', description: 'Can create/manage POs', category: 'suppliers' },
  
  // Location permissions
  { id: 'perm-070', key: 'locations.view', name: 'View Locations', description: 'Can view all locations', category: 'locations' },
  { id: 'perm-071', key: 'locations.manage', name: 'Manage Locations', description: 'Can manage locations', category: 'locations' },
  { id: 'perm-072', key: 'locations.transfer', name: 'Stock Transfers', description: 'Can manage stock transfers', category: 'locations' },
];

// Default roles with permission sets
export const DEFAULT_ROLES: Omit<Role, 'id' | 'workspace_id' | 'created_at'>[] = [
  {
    name: 'Admin',
    description: 'Full access to all features',
    is_system: true,
    permissions: DEFAULT_PERMISSIONS.map(p => p.key),
  },
  {
    name: 'Manager',
    description: 'Can manage store operations, approve refunds and discounts',
    is_system: true,
    permissions: [
      'pos.sell', 'pos.refund', 'pos.void', 'pos.discount', 'pos.price_override', 'pos.open_drawer', 'pos.park_sale',
      'inventory.view', 'inventory.edit', 'inventory.create', 'inventory.adjust',
      'reports.view', 'reports.export', 'reports.analytics',
      'settings.general',
      'customers.view', 'customers.edit', 'customers.credit',
      'employees.view', 'employees.timeclock', 'employees.approve_time',
      'suppliers.view', 'suppliers.manage', 'suppliers.orders',
      'locations.view', 'locations.transfer',
    ],
  },
  {
    name: 'Cashier',
    description: 'Can process sales and view basic reports',
    is_system: true,
    permissions: [
      'pos.sell', 'pos.park_sale',
      'inventory.view',
      'customers.view', 'customers.edit',
    ],
  },
  {
    name: 'Stock Clerk',
    description: 'Can manage inventory only',
    is_system: true,
    permissions: [
      'inventory.view', 'inventory.edit', 'inventory.create', 'inventory.adjust',
      'suppliers.view', 'suppliers.orders',
      'locations.view', 'locations.transfer',
    ],
  },
];

// Simple hash function for PIN (in production, use bcrypt)
function hashPin(pin: string): string {
  // Simple hash for demo - in production use bcrypt
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'pin_' + Math.abs(hash).toString(16);
}

// Simple password hash (in production, use bcrypt)
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'pwd_' + Math.abs(hash).toString(16);
}

export const AuthService = {
  /**
   * Initialize default permissions, roles, and admin user
   */
  async initializeAuth(workspaceId: string): Promise<void> {
    // Check if already initialized
    const existingRoles = await db.roles.where('workspace_id').equals(workspaceId).count();
    if (existingRoles > 0) {
      return; // Already initialized
    }

    // Add default permissions
    const existingPerms = await db.permissions.count();
    if (existingPerms === 0) {
      await db.permissions.bulkAdd(DEFAULT_PERMISSIONS.map(p => ({
        ...p,
        _synced: false,
      })));
    }

    // Add default roles
    const roleIds: Record<string, string> = {};
    for (const roleData of DEFAULT_ROLES) {
      const roleId = crypto.randomUUID();
      roleIds[roleData.name] = roleId;
      
      const role: LocalRole = {
        id: roleId,
        workspace_id: workspaceId,
        ...roleData,
        created_at: new Date().toISOString(),
        _synced: false,
        _dirty: true,
      };
      await db.roles.add(role);
    }

    // Create default admin user
    const adminUser: LocalUser = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      username: 'admin',
      email: 'admin@pulse.local',
      password_hash: hashPassword('admin123'), // Default password
      full_name: 'System Administrator',
      role_id: roleIds['Admin'],
      is_active: true,
      pin_code: hashPin('1234'), // Default PIN
      commission_rate: 0,
      created_at: new Date().toISOString(),
      _synced: false,
      _dirty: true,
    };
    await db.users.add(adminUser);

    console.log('Auth system initialized with default admin user (admin/admin123, PIN: 1234)');
  },

  /**
   * Login with username and password
   */
  async loginWithPassword(username: string, password: string): Promise<User | null> {
    const passwordHash = hashPassword(password);
    const user = await db.users
      .where('username')
      .equals(username)
      .first();

    if (!user || user.password_hash !== passwordHash || !user.is_active) {
      return null;
    }

    // Update last login
    await db.users.update(user.id, {
      last_login: new Date().toISOString(),
      _dirty: true,
    });

    // Log activity
    await this.logActivity(user.workspace_id, user.id, 'login', 'user', user.id, 'User logged in with password');

    return user;
  },

  /**
   * Login with PIN code (quick login for POS)
   */
  async loginWithPin(pin: string, workspaceId: string): Promise<User | null> {
    const pinHash = hashPin(pin);
    const user = await db.users
      .where('workspace_id')
      .equals(workspaceId)
      .filter(u => u.pin_code === pinHash && u.is_active)
      .first();

    if (!user) {
      return null;
    }

    // Update last login
    await db.users.update(user.id, {
      last_login: new Date().toISOString(),
      _dirty: true,
    });

    // Log activity
    await this.logActivity(user.workspace_id, user.id, 'login', 'user', user.id, 'User logged in with PIN');

    return user;
  },

  /**
   * Get user's role
   */
  async getUserRole(roleId: string): Promise<Role | null> {
    const role = await db.roles.get(roleId);
    return role || null;
  },

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const user = await db.users.get(userId);
    if (!user || !user.is_active) return false;

    const role = await db.roles.get(user.role_id);
    if (!role) return false;

    return role.permissions.includes(permissionKey);
  },

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await db.users.get(userId);
    if (!user || !user.is_active) return [];

    const role = await db.roles.get(user.role_id);
    if (!role) return [];

    return role.permissions;
  },

  /**
   * Create a new user
   */
  async createUser(userData: {
    workspaceId: string;
    username: string;
    email?: string;
    password: string;
    fullName: string;
    roleId: string;
    locationId?: string;
    pin?: string;
    employeeId?: string;
    commissionRate?: number;
    hourlyRate?: number;
  }): Promise<User> {
    // Check if username exists
    const existing = await db.users.where('username').equals(userData.username).first();
    if (existing) {
      throw new Error('Username already exists');
    }

    const user: LocalUser = {
      id: crypto.randomUUID(),
      workspace_id: userData.workspaceId,
      username: userData.username,
      email: userData.email,
      password_hash: hashPassword(userData.password),
      full_name: userData.fullName,
      role_id: userData.roleId,
      location_id: userData.locationId,
      is_active: true,
      pin_code: userData.pin ? hashPin(userData.pin) : undefined,
      employee_id: userData.employeeId,
      commission_rate: userData.commissionRate || 0,
      hourly_rate: userData.hourlyRate,
      created_at: new Date().toISOString(),
      _synced: false,
      _dirty: true,
    };

    await db.users.add(user);
    return user;
  },

  /**
   * Update a user
   */
  async updateUser(userId: string, updates: Partial<{
    email: string;
    fullName: string;
    roleId: string;
    locationId: string;
    isActive: boolean;
    password: string;
    pin: string;
    employeeId: string;
    commissionRate: number;
    hourlyRate: number;
  }>): Promise<void> {
    const updateData: Partial<LocalUser> = {
      updated_at: new Date().toISOString(),
      _dirty: true,
    };

    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
    if (updates.roleId !== undefined) updateData.role_id = updates.roleId;
    if (updates.locationId !== undefined) updateData.location_id = updates.locationId;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.password !== undefined) updateData.password_hash = hashPassword(updates.password);
    if (updates.pin !== undefined) updateData.pin_code = hashPin(updates.pin);
    if (updates.employeeId !== undefined) updateData.employee_id = updates.employeeId;
    if (updates.commissionRate !== undefined) updateData.commission_rate = updates.commissionRate;
    if (updates.hourlyRate !== undefined) updateData.hourly_rate = updates.hourlyRate;

    await db.users.update(userId, updateData);
  },

  /**
   * Get all users for a workspace
   */
  async getUsers(workspaceId: string): Promise<User[]> {
    return await db.users
      .where('workspace_id')
      .equals(workspaceId)
      .filter(u => !u._deleted)
      .toArray();
  },

  /**
   * Get all roles for a workspace (or all roles if no workspace specified)
   */
  async getRoles(workspaceId?: string): Promise<Role[]> {
    if (workspaceId) {
      return await db.roles
        .where('workspace_id')
        .equals(workspaceId)
        .filter(r => !r._deleted)
        .toArray();
    }
    return await db.roles.filter(r => !r._deleted).toArray();
  },

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<Permission[]> {
    return await db.permissions.toArray();
  },

  /**
   * Create a custom role (simplified API)
   */
  async createRole(
    nameOrRoleData: string | {
      workspaceId: string;
      name: string;
      description?: string;
      permissions: string[];
    },
    permissions?: string[],
    description?: string
  ): Promise<Role> {
    let roleData: {
      workspaceId: string;
      name: string;
      description?: string;
      permissions: string[];
    };

    if (typeof nameOrRoleData === 'string') {
      // New simplified API: createRole(name, permissions, description)
      roleData = {
        workspaceId: 'default',
        name: nameOrRoleData,
        description,
        permissions: permissions || [],
      };
    } else {
      // Original API: createRole(roleData)
      roleData = nameOrRoleData;
    }
    
    const role: LocalRole = {
      id: crypto.randomUUID(),
      workspace_id: roleData.workspaceId,
      name: roleData.name,
      description: roleData.description,
      permissions: roleData.permissions,
      is_system: false,
      created_at: new Date().toISOString(),
      _synced: false,
      _dirty: true,
    };

    await db.roles.add(role);
    return role;
  },

  /**
   * Update a role's permissions
   */
  async updateRole(roleId: string, updates: {
    name?: string;
    description?: string;
    permissions?: string[];
  }): Promise<void> {
    const role = await db.roles.get(roleId);
    if (role?.is_system) {
      throw new Error('Cannot modify system roles');
    }

    await db.roles.update(roleId, {
      ...updates,
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  },

  /**
   * Verify manager PIN for sensitive operations
   */
  async verifyManagerPin(pin: string, workspaceId: string): Promise<boolean> {
    const pinHash = hashPin(pin);
    const user = await db.users
      .where('workspace_id')
      .equals(workspaceId)
      .filter(u => u.pin_code === pinHash && u.is_active)
      .first();

    if (!user) return false;

    const role = await db.roles.get(user.role_id);
    if (!role) return false;

    // Check if user has manager or admin level permissions
    return role.permissions.includes('pos.refund') || role.permissions.includes('pos.void');
  },

  /**
   * Log an activity
   */
  async logActivity(
    workspaceId: string,
    userId: string,
    action: ActivityLogAction,
    entityType: string,
    entityId?: string,
    details?: string,
    beforeValue?: unknown,
    afterValue?: unknown
  ): Promise<void> {
    const log: LocalActivityLog = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      before_value: beforeValue,
      after_value: afterValue,
      details,
      created_at: new Date().toISOString(),
      _synced: false,
    };

    await db.activity_logs.add(log);
  },

  /**
   * Get activity logs
   */
  async getActivityLogs(
    workspaceIdOrOptions?: string | {
      limit?: number;
      userId?: string;
      action?: string;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    options?: {
      userId?: string;
      action?: ActivityLogAction;
      entityType?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<LocalActivityLog[]> {
    // Handle both old API (workspaceId, options) and new API (just options)
    let actualOptions: typeof options = {};
    
    if (typeof workspaceIdOrOptions === 'object' && workspaceIdOrOptions !== null) {
      // New API: just options object
      actualOptions = {
        userId: workspaceIdOrOptions.userId,
        action: workspaceIdOrOptions.action as ActivityLogAction | undefined,
        entityType: workspaceIdOrOptions.entityType,
        startDate: workspaceIdOrOptions.startDate?.toISOString(),
        endDate: workspaceIdOrOptions.endDate?.toISOString(),
        limit: workspaceIdOrOptions.limit,
      };
    } else if (typeof workspaceIdOrOptions === 'string') {
      // Old API: workspaceId + options
      actualOptions = options || {};
    }

    let results = await db.activity_logs.toArray();

    if (actualOptions?.userId) {
      results = results.filter(log => log.user_id === actualOptions.userId);
    }
    if (actualOptions?.action) {
      results = results.filter(log => log.action === actualOptions.action);
    }
    if (actualOptions?.entityType) {
      results = results.filter(log => log.entity_type === actualOptions.entityType);
    }
    if (actualOptions?.startDate) {
      results = results.filter(log => log.created_at >= actualOptions.startDate!);
    }
    if (actualOptions?.endDate) {
      results = results.filter(log => log.created_at <= actualOptions.endDate!);
    }

    // Sort by created_at descending
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (actualOptions?.limit) {
      results = results.slice(0, actualOptions.limit);
    }

    return results;
  },

  /**
   * Get all users (simplified API for UI)
   */
  async getAllUsers(): Promise<LocalUser[]> {
    return await db.users.filter(u => !u._deleted).toArray();
  },

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<void> {
    await db.users.update(userId, { _deleted: true, _dirty: true });
  },

  /**
   * Reset password
   */
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    await db.users.update(userId, {
      password_hash: hashPassword(newPassword),
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  },

  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = await db.roles.get(roleId);
    if (role?.is_system) {
      throw new Error('Cannot delete system roles');
    }
    await db.roles.update(roleId, { _deleted: true, _dirty: true });
  },
};
