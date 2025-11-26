import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Clock,
  UserCheck,
  UserX,
  Key,
  Save,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { AuthService } from '@pulse/core-logic';
import { RequirePermission } from '../../components/RequirePermission';
import { usePermission } from '../../hooks/usePermission';

// UI-friendly user interface
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  pin_code?: string;
  role_id?: string;
  is_active: boolean;
  hourly_rate?: number;
  created_at: string;
  updated_at: string;
}

// Database user format (matches LocalUser from core-logic)
interface DbUser {
  id: string;
  email?: string;
  full_name?: string;
  pin_code?: string;
  role_id: string;
  is_active: boolean;
  hourly_rate?: number;
  created_at?: string;
  updated_at?: string;
}

// Map database user to UI user format
function mapDbUserToUser(dbUser: DbUser): User {
  const nameParts = (dbUser.full_name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  return {
    id: dbUser.id,
    email: dbUser.email || '',
    first_name: firstName,
    last_name: lastName,
    pin_code: dbUser.pin_code,
    role_id: dbUser.role_id,
    is_active: dbUser.is_active,
    hourly_rate: dbUser.hourly_rate,
    created_at: dbUser.created_at || new Date().toISOString(),
    updated_at: dbUser.updated_at || dbUser.created_at || new Date().toISOString(),
  };
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

type ModalMode = 'create' | 'edit' | 'password' | null;

export const UserManagementScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const canEdit = usePermission('admin.users');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        AuthService.getAllUsers(),
        AuthService.getRoles(),
      ]);
      // Map database users to UI-friendly format
      const mappedUsers = usersData.map(mapDbUserToUser);
      setUsers(mappedUsers);
      setRoles(rolesData as Role[]);
    } catch (error) {
      console.error('Failed to load users:', error);
      showNotification('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(term) ||
      user.first_name.toLowerCase().includes(term) ||
      user.last_name.toLowerCase().includes(term)
    );
  });

  const getRoleName = (roleId?: string) => {
    if (!roleId) return 'No Role';
    const role = roles.find(r => r.id === roleId);
    return role?.name || 'Unknown';
  };

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setModalMode('create');
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setModalMode('edit');
  };

  const handleOpenPasswordReset = (user: User) => {
    setSelectedUser(user);
    setModalMode('password');
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedUser(null);
  };

  const handleToggleActive = async (user: User) => {
    try {
      await AuthService.updateUser(user.id, { isActive: !user.is_active });
      await loadData();
      showNotification('success', `User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      showNotification('error', 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}? This action cannot be undone.`)) {
      return;
    }
    try {
      await AuthService.deleteUser(user.id);
      await loadData();
      showNotification('success', 'User deleted successfully');
    } catch (error) {
      showNotification('error', 'Failed to delete user');
    }
  };

  const handleSaveUser = async (data: Partial<User> & { password?: string }) => {
    try {
      if (modalMode === 'create') {
        await AuthService.createUser({
          workspaceId: 'default',
          username: data.email!.split('@')[0], // Use email prefix as username
          email: data.email!,
          fullName: `${data.first_name} ${data.last_name}`,
          password: data.password!,
          pin: data.pin_code,
          roleId: data.role_id || '',
          hourlyRate: data.hourly_rate,
        });
        showNotification('success', 'User created successfully');
      } else if (modalMode === 'edit' && selectedUser) {
        await AuthService.updateUser(selectedUser.id, {
          email: data.email,
          fullName: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : undefined,
          pin: data.pin_code,
          roleId: data.role_id,
          hourlyRate: data.hourly_rate,
        });
        showNotification('success', 'User updated successfully');
      } else if (modalMode === 'password' && selectedUser) {
        await AuthService.resetPassword(selectedUser.id, data.password!);
        showNotification('success', 'Password reset successfully');
      }
      await loadData();
      handleCloseModal();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save user';
      showNotification('error', errorMessage);
    }
  };

  return (
    <RequirePermission permission="admin.users" showAccessDenied>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">User Management</h1>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Manage employees and access control
                </p>
              </div>
            </div>
            {canEdit && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add User</span>
              </button>
            )}
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mx-6 mt-4 p-4 rounded-xl flex items-center gap-3 ${
            notification.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Users className="w-16 h-16 text-gray-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No users found' : 'No users yet'}
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                {searchTerm ? 'Try adjusting your search term' : 'Add your first user to get started'}
              </p>
              {!searchTerm && canEdit && (
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add User</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredUsers.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  roleName={getRoleName(user.role_id)}
                  canEdit={canEdit}
                  onEdit={() => handleOpenEdit(user)}
                  onToggleActive={() => handleToggleActive(user)}
                  onResetPassword={() => handleOpenPasswordReset(user)}
                  onDelete={() => handleDeleteUser(user)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {modalMode && (
          <UserModal
            mode={modalMode}
            user={selectedUser}
            roles={roles}
            onClose={handleCloseModal}
            onSave={handleSaveUser}
          />
        )}
      </div>
    </RequirePermission>
  );
};

interface UserCardProps {
  user: User;
  roleName: string;
  canEdit: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  roleName,
  canEdit,
  onEdit,
  onToggleActive,
  onResetPassword,
  onDelete,
}) => {
  const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border ${
      user.is_active 
        ? 'border-gray-200 dark:border-slate-700' 
        : 'border-red-200 dark:border-red-800/50'
    } p-4 hover:shadow-lg transition-shadow`}>
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold ${
          user.is_active 
            ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
            : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
        }`}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {user.first_name} {user.last_name}
            </h3>
            {!user.is_active && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 truncate">{user.email}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-slate-500">
              <Shield className="w-3.5 h-3.5" />
              {roleName}
            </span>
            {user.pin_code && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-slate-500">
                <Key className="w-3.5 h-3.5" />
                PIN Set
              </span>
            )}
            {user.hourly_rate && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                ${user.hourly_rate}/hr
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Edit user"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={onResetPassword}
              className="p-2 text-gray-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
              title="Reset password"
            >
              <Key className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleActive}
              className={`p-2 rounded-lg transition-colors ${
                user.is_active 
                  ? 'text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
              title={user.is_active ? 'Deactivate user' : 'Activate user'}
            >
              {user.is_active ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete user"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface UserModalProps {
  mode: ModalMode;
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSave: (data: Partial<User> & { password?: string }) => void;
}

const UserModal: React.FC<UserModalProps> = ({ mode, user, roles, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    pin_code: user?.pin_code || '',
    role_id: user?.role_id || '',
    hourly_rate: user?.hourly_rate?.toString() || '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isPasswordMode = mode === 'password';
  const title = mode === 'create' ? 'Create User' : mode === 'edit' ? 'Edit User' : 'Reset Password';

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!isPasswordMode) {
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (!formData.first_name) newErrors.first_name = 'First name is required';
      if (!formData.last_name) newErrors.last_name = 'Last name is required';
      if (formData.pin_code && formData.pin_code.length !== 4) {
        newErrors.pin_code = 'PIN must be 4 digits';
      }
    }

    if (mode === 'create' || isPasswordMode) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        pin_code: formData.pin_code || undefined,
        role_id: formData.role_id || undefined,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
        password: formData.password || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isPasswordMode && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-700 border ${
                      errors.first_name ? 'border-red-500' : 'border-transparent'
                    } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
                    placeholder="John"
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-xs text-red-500">{errors.first_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-700 border ${
                      errors.last_name ? 'border-red-500' : 'border-transparent'
                    } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
                    placeholder="Doe"
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-xs text-red-500">{errors.last_name}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-700 border ${
                    errors.email ? 'border-red-500' : 'border-transparent'
                  } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, role_id: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-700 border-transparent rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    PIN Code (4 digits)
                  </label>
                  <input
                    type="text"
                    value={formData.pin_code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setFormData(prev => ({ ...prev, pin_code: val }));
                    }}
                    className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-700 border ${
                      errors.pin_code ? 'border-red-500' : 'border-transparent'
                    } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
                    placeholder="1234"
                    maxLength={4}
                  />
                  {errors.pin_code && (
                    <p className="mt-1 text-xs text-red-500">{errors.pin_code}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-700 border-transparent rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="15.00"
                />
              </div>
            </>
          )}

          {(mode === 'create' || isPasswordMode) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className={`w-full px-4 py-2.5 pr-12 bg-gray-100 dark:bg-slate-700 border ${
                      errors.password ? 'border-red-500' : 'border-transparent'
                    } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-700 border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-transparent'
                  } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{mode === 'create' ? 'Create' : 'Save'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
