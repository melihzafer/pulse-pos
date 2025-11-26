import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, UserPlus, Shield, User as UserIcon } from 'lucide-react';
import { db, Cashier } from '@pulse/core-logic';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export const CashierManagement: React.FC = () => {
  const { t } = useTranslation();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    username: '',
    pin_code: '',
    full_name: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    is_active: true,
  });

  useEffect(() => {
    loadCashiers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCashiers = async () => {
    try {
      const allCashiers = await db.cashiers
        .filter(c => !c._deleted)
        .toArray();
      setCashiers(allCashiers);
    } catch (error) {
      console.error('Error loading cashiers:', error);
      toast.error(t('cashiers.loadError', 'Failed to load cashiers'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cashier?: Cashier) => {
    if (cashier) {
      setEditingCashier(cashier);
      setFormData({
        username: cashier.username,
        pin_code: '', // Don't show existing PIN
        full_name: cashier.full_name,
        role: cashier.role,
        is_active: cashier.is_active,
      });
    } else {
      setEditingCashier(null);
      setFormData({
        username: '',
        pin_code: '',
        full_name: '',
        role: 'cashier',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCashier(null);
    setFormData({
      username: '',
      pin_code: '',
      full_name: '',
      role: 'cashier',
      is_active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.username.trim()) {
      toast.error(t('cashiers.usernameRequired', 'Username is required'));
      return;
    }

    if (!editingCashier && !formData.pin_code) {
      toast.error(t('cashiers.pinRequired', 'PIN is required for new cashiers'));
      return;
    }

    if (formData.pin_code && (formData.pin_code.length < 4 || formData.pin_code.length > 6)) {
      toast.error(t('cashiers.pinLength', 'PIN must be 4-6 digits'));
      return;
    }

    if (!/^\d*$/.test(formData.pin_code)) {
      toast.error(t('cashiers.pinDigitsOnly', 'PIN must contain only digits'));
      return;
    }

    if (!formData.full_name.trim()) {
      toast.error(t('cashiers.fullNameRequired', 'Full name is required'));
      return;
    }

    try {
      if (editingCashier) {
        // Update existing cashier
        const updateData: Partial<Cashier> = {
          username: formData.username.trim(),
          full_name: formData.full_name.trim(),
          role: formData.role,
          is_active: formData.is_active,
          _dirty: true,
        };

        // Only update PIN if provided
        if (formData.pin_code) {
          updateData.pin_code = formData.pin_code;
        }

        await db.cashiers.update(editingCashier.id, updateData);
        toast.success(t('cashiers.updateSuccess', 'Cashier updated successfully'));
      } else {
        // Check for duplicate username
        const existingCashier = await db.cashiers
          .where('username')
          .equalsIgnoreCase(formData.username.trim())
          .and(c => !c._deleted)
          .first();

        if (existingCashier) {
          toast.error(t('cashiers.usernameTaken', 'Username is already taken'));
          return;
        }

        // Create new cashier
        const workspaces = await db.workspaces.toArray();
        const workspaceId = workspaces[0]?.id || 'default';

        const newCashier: Cashier = {
          id: crypto.randomUUID(),
          workspace_id: workspaceId,
          username: formData.username.trim(),
          pin_code: formData.pin_code,
          full_name: formData.full_name.trim(),
          role: formData.role,
          is_active: formData.is_active,
          created_at: new Date().toISOString(),
          _synced: false,
          _dirty: true,
        };

        await db.cashiers.add(newCashier);
        toast.success(t('cashiers.createSuccess', 'Cashier created successfully'));
      }

      handleCloseModal();
      loadCashiers();
    } catch (error) {
      console.error('Error saving cashier:', error);
      toast.error(t('cashiers.saveError', 'Failed to save cashier'));
    }
  };

  const handleDelete = async (cashier: Cashier) => {
    if (!confirm(t('cashiers.deleteConfirm', `Are you sure you want to delete ${cashier.full_name}?`))) {
      return;
    }

    try {
      await db.cashiers.update(cashier.id, { _deleted: true, _dirty: true });
      toast.success(t('cashiers.deleteSuccess', 'Cashier deleted successfully'));
      loadCashiers();
    } catch (error) {
      console.error('Error deleting cashier:', error);
      toast.error(t('cashiers.deleteError', 'Failed to delete cashier'));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'manager':
        return <UserIcon className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('cashiers.title', 'Cashier Management')}
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mt-1">
            {t('cashiers.subtitle', 'Manage cashier accounts and permissions')}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
        >
          <UserPlus size={20} />
          {t('cashiers.addNew', 'Add Cashier')}
        </button>
      </div>

      {/* Cashier List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cashiers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
            <UserIcon size={48} className="mb-4" />
            <p>{t('cashiers.noCashiers', 'No cashiers found')}</p>
            <p className="text-sm mt-2">{t('cashiers.addFirstCashier', 'Add your first cashier to get started')}</p>
          </div>
        ) : (
          cashiers.map((cashier) => (
            <div
              key={cashier.id}
              className="glass-panel p-4 rounded-xl hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-semibold text-lg">
                    {cashier.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {cashier.full_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      @{cashier.username}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenModal(cashier)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title={t('common.edit', 'Edit')}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cashier)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title={t('common.delete', 'Delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(cashier.role)}`}>
                  {getRoleIcon(cashier.role)}
                  {t(`cashiers.role.${cashier.role}`, cashier.role)}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  cashier.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {cashier.is_active ? t('cashiers.active', 'Active') : t('cashiers.inactive', 'Inactive')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingCashier
                ? t('cashiers.editCashier', 'Edit Cashier')
                : t('cashiers.addNewCashier', 'Add New Cashier')}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('cashiers.username', 'Username')} *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder={t('cashiers.usernamePlaceholder', 'Enter username')}
                  autoFocus
                />
              </div>

              {/* PIN Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('cashiers.pinCode', 'PIN Code')} {!editingCashier && '*'}
                </label>
                <input
                  type="password"
                  value={formData.pin_code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 6) {
                      setFormData({ ...formData, pin_code: value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder={editingCashier ? t('cashiers.leaveEmptyToKeep', 'Leave empty to keep current') : '••••••'}
                  maxLength={6}
                  inputMode="numeric"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  {t('cashiers.pinHelp', '4-6 digit PIN code')}
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('cashiers.fullName', 'Full Name')} *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder={t('cashiers.fullNamePlaceholder', 'Enter full name')}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('cashiers.role', 'Role')} *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'cashier' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                >
                  <option value="cashier">{t('cashiers.role.cashier', 'Cashier')}</option>
                  <option value="manager">{t('cashiers.role.manager', 'Manager')}</option>
                  <option value="admin">{t('cashiers.role.admin', 'Admin')}</option>
                </select>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-slate-300">
                  {t('cashiers.activeStatus', 'Active (can log in)')}
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
                >
                  {editingCashier ? t('common.save', 'Save') : t('cashiers.create', 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
