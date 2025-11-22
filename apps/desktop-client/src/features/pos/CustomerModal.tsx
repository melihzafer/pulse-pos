import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, Customer, useCartStore } from '@pulse/core-logic';
import { toast } from 'sonner';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { setCustomer } = useCartStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        loadCustomers();
        return;
      }

      const results = await db.customers
        .filter(c => 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.phone?.includes(searchQuery) ?? false) ||
          (c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        )
        .toArray();
      setCustomers(results);
    };

    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadCustomers = async () => {
    const all = await db.customers.toArray();
    setCustomers(all);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name) {
      toast.error(t('customer.nameRequired'));
      return;
    }

    try {
      const customer: Customer = {
        id: crypto.randomUUID(),
        workspace_id: '00000000-0000-0000-0000-000000000000', // TODO: Get from settings
        name: newCustomer.name,
        phone: newCustomer.phone || undefined,
        email: newCustomer.email || undefined,
        points: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.customers.add(customer);
      setCustomer(customer);
      toast.success(t('customer.created'));
      onClose();
      setIsCreating(false);
      setNewCustomer({ name: '', phone: '', email: '' });
    } catch (error) {
      console.error('Failed to create customer:', error);
      toast.error(t('customer.createError'));
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setCustomer(customer);
    toast.success(t('customer.selected', { name: customer.name }));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="text-blue-500" />
            {isCreating ? t('customer.addNew') : t('customer.select')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4">
          {!isCreating ? (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('customer.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  autoFocus
                />
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full p-3 flex items-center gap-3 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors border border-dashed border-blue-200 dark:border-blue-800"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <UserPlus size={20} />
                  </div>
                  <span className="font-medium">{t('customer.createNew')}</span>
                </button>

                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-400">
                        <User size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 dark:text-white">{customer.name}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {customer.phone || customer.email || t('customer.noContact')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{customer.points} pts</p>
                    </div>
                  </button>
                ))}
                
                {customers.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-gray-500">
                    {t('customer.notFound')}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t('common.name')} *
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t('customer.phone')}
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t('customer.email')}
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCreateCustomer}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
