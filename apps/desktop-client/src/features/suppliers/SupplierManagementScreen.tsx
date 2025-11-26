import { useState, useEffect } from 'react';
import { Truck, Plus, Search, Edit2, Trash2, Mail, Phone, MapPin, Package, DollarSign } from 'lucide-react';
import { SupplierService } from '@pulse/core-logic';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { LocalSupplier } from '@pulse/core-logic';

const WORKSPACE_ID = '00000000-0000-0000-0000-000000000000'; // TODO: Get from settings

interface SupplierStats {
  totalProducts: number;
  totalPurchaseOrders: number;
  totalSpend: number;
}

export function SupplierManagementScreen() {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<LocalSupplier[]>([]);
  const [supplierStats, setSupplierStats] = useState<Record<string, SupplierStats>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<LocalSupplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await SupplierService.getSuppliers(WORKSPACE_ID, { activeOnly: false });
      setSuppliers(data);

      // Load stats for each supplier
      const stats: Record<string, SupplierStats> = {};
      for (const supplier of data) {
        stats[supplier.id] = await SupplierService.getSupplierStats(supplier.id);
      }
      setSupplierStats(stats);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this supplier?')) return;

    try {
      await SupplierService.deactivateSupplier(id);
      toast.success('Supplier deactivated successfully');
      loadSuppliers();
    } catch (error) {
      console.error('Failed to delete supplier:', error);
      toast.error('Failed to deactivate supplier');
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(query) ||
      supplier.contact_person?.toLowerCase().includes(query) ||
      supplier.email?.toLowerCase().includes(query) ||
      supplier.phone?.toLowerCase().includes(query)
    );
  });

  const activeSuppliers = filteredSuppliers.filter((s) => s.is_active);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('Supplier Management')}
                </h1>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  Manage suppliers and purchase orders
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedSupplier(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Supplier</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search suppliers by name, contact, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center space-x-4 text-sm">
            <span className="text-gray-600 dark:text-slate-400">
              Total Suppliers: <span className="font-semibold text-gray-900 dark:text-white">{suppliers.length}</span>
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600 dark:text-slate-400">
              Active: <span className="font-semibold text-green-600">{activeSuppliers.length}</span>
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600 dark:text-slate-400">
              Inactive: <span className="font-semibold text-red-600">{suppliers.length - activeSuppliers.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Supplier Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : activeSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 mx-auto text-gray-400 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No suppliers found' : 'No suppliers yet'}
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {searchQuery ? 'Try a different search query' : 'Get started by adding your first supplier'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Add Supplier</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeSuppliers.map((supplier) => {
              const stats = supplierStats[supplier.id] || {
                totalProducts: 0,
                totalPurchaseOrders: 0,
                totalSpend: 0,
              };

              return (
                <div
                  key={supplier.id}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {supplier.name}
                        </h3>
                        {supplier.contact_person && (
                          <p className="text-sm text-gray-600 dark:text-slate-400">
                            {supplier.contact_person}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setIsAddModalOpen(true);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="p-6 space-y-3 border-b border-gray-200 dark:border-slate-700">
                    {supplier.email && (
                      <div className="flex items-center space-x-3 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-slate-300">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center space-x-3 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-slate-300">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-start space-x-3 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-700 dark:text-slate-300 flex-1">{supplier.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="p-6 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-lg mb-2">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.totalProducts}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">Products</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 mx-auto bg-purple-100 dark:bg-purple-900/20 rounded-lg mb-2">
                        <Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.totalPurchaseOrders}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 mx-auto bg-green-100 dark:bg-green-900/20 rounded-lg mb-2">
                        <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.totalSpend.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">Spend</div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 bg-gray-50 dark:bg-slate-900/50 rounded-b-lg">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-slate-400">
                        Payment: <span className="font-medium text-gray-900 dark:text-white">{supplier.payment_terms || 'N/A'}</span>
                      </span>
                      {supplier.lead_time_days != null && (
                        <span className="text-gray-600 dark:text-slate-400">
                          Lead: <span className="font-medium text-gray-900 dark:text-white">{supplier.lead_time_days}d</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <SupplierModal
          supplier={selectedSupplier}
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedSupplier(null);
          }}
          onSave={() => {
            setIsAddModalOpen(false);
            setSelectedSupplier(null);
            loadSuppliers();
          }}
        />
      )}
    </div>
  );
}

interface SupplierModalProps {
  supplier: LocalSupplier | null;
  onClose: () => void;
  onSave: () => void;
}

function SupplierModal({ supplier, onClose, onSave }: SupplierModalProps) {
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contact_person: supplier?.contact_person || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    payment_terms: supplier?.payment_terms || 'net30',
    lead_time_days: supplier?.lead_time_days?.toString() || '',
    notes: supplier?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    try {
      setSaving(true);
      if (supplier) {
        await SupplierService.updateSupplier(supplier.id, {
          ...formData,
          lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) : undefined,
        });
        toast.success('Supplier updated successfully');
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataToCreate: any = {
          ...formData,
        };
        if (formData.lead_time_days) {
          dataToCreate.lead_time_days = parseInt(formData.lead_time_days);
        }
        await SupplierService.createSupplier(WORKSPACE_ID, dataToCreate);
        toast.success('Supplier created successfully');
      }
      onSave();
    } catch (error) {
      console.error('Failed to save supplier:', error);
      toast.error('Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {supplier ? 'Edit Supplier' : 'Add Supplier'}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Supplier Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                placeholder="ABC Supplies Inc."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                placeholder="contact@supplier.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                placeholder="+359 888 123 456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Payment Terms
              </label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value as 'cash' | 'net15' | 'net30' | 'net60' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
              >
                <option value="cash">Cash</option>
                <option value="net15">Net 15</option>
                <option value="net30">Net 30</option>
                <option value="net60">Net 60</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                placeholder="123 Main St, Sofia, Bulgaria"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Lead Time (days)
              </label>
              <input
                type="number"
                value={formData.lead_time_days}
                onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                placeholder="7"
                min="0"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                placeholder="Additional notes about this supplier..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : supplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
