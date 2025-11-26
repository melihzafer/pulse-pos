import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Users,
} from 'lucide-react';
import { AuthService } from '@pulse/core-logic';
import { RequirePermission } from '../../components/RequirePermission';
import { usePermission } from '../../hooks/usePermission';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

// All available permissions in the system
const AVAILABLE_PERMISSIONS = [
  { id: 'pos.access', name: 'POS Access', description: 'Access the point of sale', category: 'Point of Sale' },
  { id: 'pos.refund', name: 'Process Refunds', description: 'Process customer refunds', category: 'Point of Sale' },
  { id: 'pos.void', name: 'Void Transactions', description: 'Void sales transactions', category: 'Point of Sale' },
  { id: 'pos.discount', name: 'Apply Discounts', description: 'Apply discounts to sales', category: 'Point of Sale' },
  { id: 'inventory.view', name: 'View Inventory', description: 'View inventory levels', category: 'Inventory' },
  { id: 'inventory.manage', name: 'Manage Inventory', description: 'Add, edit, delete inventory items', category: 'Inventory' },
  { id: 'inventory.adjust', name: 'Adjust Stock', description: 'Make stock adjustments', category: 'Inventory' },
  { id: 'inventory.transfer', name: 'Transfer Stock', description: 'Transfer stock between locations', category: 'Inventory' },
  { id: 'reports.view', name: 'View Reports', description: 'Access reports and analytics', category: 'Reports' },
  { id: 'reports.export', name: 'Export Reports', description: 'Export reports to file', category: 'Reports' },
  { id: 'customers.view', name: 'View Customers', description: 'View customer information', category: 'Customers' },
  { id: 'customers.manage', name: 'Manage Customers', description: 'Add, edit, delete customers', category: 'Customers' },
  { id: 'admin.users', name: 'Manage Users', description: 'Manage user accounts', category: 'Administration' },
  { id: 'admin.roles', name: 'Manage Roles', description: 'Manage roles and permissions', category: 'Administration' },
  { id: 'admin.settings', name: 'System Settings', description: 'Access system settings', category: 'Administration' },
  { id: 'admin.locations', name: 'Manage Locations', description: 'Manage store locations', category: 'Administration' },
];

type ModalMode = 'create' | 'edit' | null;

export const RoleManagementScreen: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const canEdit = usePermission('admin.roles');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const rolesData = await AuthService.getRoles();
      setRoles(rolesData as Role[]);
    } catch (error) {
      console.error('Failed to load roles:', error);
      showNotification('error', 'Failed to load roles');
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

  const filteredRoles = roles.filter(role => {
    const term = searchTerm.toLowerCase();
    return (
      role.name.toLowerCase().includes(term) ||
      (role.description?.toLowerCase().includes(term) ?? false)
    );
  });

  const handleOpenCreate = () => {
    setSelectedRole(null);
    setModalMode('create');
  };

  const handleOpenEdit = (role: Role) => {
    setSelectedRole(role);
    setModalMode('edit');
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedRole(null);
  };

  const handleDeleteRole = async (role: Role) => {
    if (!window.confirm(`Are you sure you want to delete the "${role.name}" role? Users with this role will lose their permissions.`)) {
      return;
    }
    try {
      await AuthService.deleteRole(role.id);
      await loadData();
      showNotification('success', 'Role deleted successfully');
    } catch (error) {
      showNotification('error', 'Failed to delete role');
    }
  };

  const handleSaveRole = async (data: { name: string; description: string; permissions: string[] }) => {
    try {
      if (modalMode === 'create') {
        await AuthService.createRole(data.name, data.permissions, data.description);
        showNotification('success', 'Role created successfully');
      } else if (modalMode === 'edit' && selectedRole) {
        await AuthService.updateRole(selectedRole.id, {
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        });
        showNotification('success', 'Role updated successfully');
      }
      await loadData();
      handleCloseModal();
    } catch (error) {
      showNotification('error', 'Failed to save role');
    }
  };

  // Group permissions by category
  const permissionsByCategory = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  return (
    <RequirePermission permission="admin.roles" showAccessDenied>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Role Management</h1>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Configure roles and permissions
                </p>
              </div>
            </div>
            {canEdit && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add Role</span>
              </button>
            )}
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-purple-500"
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
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Shield className="w-16 h-16 text-gray-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No roles found' : 'No roles yet'}
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                {searchTerm ? 'Try adjusting your search term' : 'Create roles to assign permissions to users'}
              </p>
              {!searchTerm && canEdit && (
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Role</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredRoles.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  permissionsByCategory={permissionsByCategory}
                  canEdit={canEdit}
                  onEdit={() => handleOpenEdit(role)}
                  onDelete={() => handleDeleteRole(role)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {modalMode && (
          <RoleModal
            mode={modalMode}
            role={selectedRole}
            permissionsByCategory={permissionsByCategory}
            onClose={handleCloseModal}
            onSave={handleSaveRole}
          />
        )}
      </div>
    </RequirePermission>
  );
};

interface RoleCardProps {
  role: Role;
  permissionsByCategory: Record<string, typeof AVAILABLE_PERMISSIONS>;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({
  role,
  permissionsByCategory,
  canEdit,
  onEdit,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Get permission names for display
  const getPermissionName = (permId: string) => {
    for (const perms of Object.values(permissionsByCategory)) {
      const found = perms.find(p => p.id === permId);
      if (found) return found.name;
    }
    return permId;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-white" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {role.name}
            </h3>
            {role.description && (
              <p className="text-sm text-gray-600 dark:text-slate-400 truncate">{role.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-slate-500">
                <Users className="w-3.5 h-3.5" />
                {role.permissions.length} permissions
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            >
              {expanded ? 'Hide' : 'Show'} Permissions
            </button>
            {canEdit && (
              <>
                <button
                  onClick={onEdit}
                  className="p-2 text-gray-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  title="Edit role"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete role"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Permissions */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-slate-700/50">
          {role.permissions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-500 italic">No permissions assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {role.permissions.map(permId => (
                <span
                  key={permId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full"
                >
                  <Check className="w-3.5 h-3.5" />
                  {getPermissionName(permId)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface RoleModalProps {
  mode: ModalMode;
  role: Role | null;
  permissionsByCategory: Record<string, typeof AVAILABLE_PERMISSIONS>;
  onClose: () => void;
  onSave: (data: { name: string; description: string; permissions: string[] }) => void;
}

const RoleModal: React.FC<RoleModalProps> = ({ mode, role, permissionsByCategory, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissions: role?.permissions || [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const title = mode === 'create' ? 'Create Role' : 'Edit Role';

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Role name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTogglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  const handleToggleCategory = (category: string) => {
    const categoryPerms = permissionsByCategory[category].map(p => p.id);
    const allSelected = categoryPerms.every(p => formData.permissions.includes(p));
    
    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !categoryPerms.includes(p)),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPerms])],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-700 border ${
                    errors.name ? 'border-red-500' : 'border-transparent'
                  } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
                  placeholder="e.g., Store Manager"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-700 border-transparent rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="Brief description of this role"
                />
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Permissions ({formData.permissions.length} selected)
              </h3>

              <div className="space-y-4">
                {Object.entries(permissionsByCategory).map(([category, perms]) => {
                  const allSelected = perms.every(p => formData.permissions.includes(p.id));
                  const someSelected = perms.some(p => formData.permissions.includes(p.id));

                  return (
                    <div key={category} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                      {/* Category Header */}
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(category)}
                        className="flex items-center gap-3 w-full text-left mb-3"
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          allSelected
                            ? 'bg-purple-500 border-purple-500'
                            : someSelected
                            ? 'bg-purple-200 border-purple-500'
                            : 'border-gray-300 dark:border-slate-500'
                        }`}>
                          {(allSelected || someSelected) && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{category}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          ({perms.filter(p => formData.permissions.includes(p.id)).length}/{perms.length})
                        </span>
                      </button>

                      {/* Permissions */}
                      <div className="grid grid-cols-2 gap-2 ml-8">
                        {perms.map(perm => (
                          <label
                            key={perm.id}
                            className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(perm.id)}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="mt-0.5 w-4 h-4 text-purple-500 bg-gray-100 dark:bg-slate-600 border-gray-300 dark:border-slate-500 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
                                {perm.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-slate-500 truncate">
                                {perm.description}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-slate-700">
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
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{mode === 'create' ? 'Create Role' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
