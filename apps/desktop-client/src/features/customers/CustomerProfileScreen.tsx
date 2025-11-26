import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db, Customer, Sale, formatCurrency } from '@pulse/core-logic';
import { ArrowLeft, User, ShoppingBag, Award, FileText, Tag, Gift, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerProfileScreenProps {
  customerId: string;
  onBack: () => void;
}

type TabType = 'overview' | 'history' | 'loyalty' | 'notes';

export const CustomerProfileScreen: React.FC<CustomerProfileScreenProps> = ({ customerId, onBack }) => {
  const { t } = useTranslation();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      const customerData = await db.customers.get(customerId);
      if (!customerData) {
        toast.error(t('customer.notFound', 'Customer not found'));
        onBack();
        return;
      }
      setCustomer(customerData);
      setNotes(customerData.notes || '');

      // Load purchase history
      const customerSales = await db.sales
        .where('customer_id')
        .equals(customerId)
        .reverse()
        .sortBy('created_at');
      setSales(customerSales);
    } catch (error) {
      console.error('Failed to load customer:', error);
      toast.error(t('customer.loadError', 'Failed to load customer data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleSaveNotes = async () => {
    if (!customer) return;
    try {
      await db.customers.update(customerId, {
        notes,
        updated_at: new Date().toISOString()
      });
      toast.success(t('customer.notesSaved', 'Notes saved'));
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error(t('customer.notesSaveError', 'Failed to save notes'));
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-gradient-to-br from-slate-400 to-slate-600';
      case 'gold': return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
      case 'silver': return 'bg-gradient-to-br from-gray-300 to-gray-500';
      default: return 'bg-gradient-to-br from-amber-600 to-amber-800';
    }
  };

  const getTierProgress = (tier: string, points: number) => {
    const thresholds = { bronze: 500, silver: 1000, gold: 2500, platinum: Infinity };
    const currentThreshold = thresholds[tier as keyof typeof thresholds] || 500;
    if (currentThreshold === Infinity) return 100;
    return Math.min((points / currentThreshold) * 100, 100);
  };

  const getNextTier = (tier: string) => {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(tier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  };

  const getPointsToNextTier = (tier: string, points: number) => {
    const thresholds = { bronze: 500, silver: 1000, gold: 2500 };
    const nextThreshold = thresholds[tier as keyof typeof thresholds];
    return nextThreshold ? nextThreshold - points : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-blue-600 dark:text-blue-400 text-xl">{t('common.loading', 'Loading...')}</div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const tierProgress = getTierProgress(customer.tier || 'bronze', customer.points || 0);
  const nextTier = getNextTier(customer.tier || 'bronze');
  const pointsNeeded = getPointsToNextTier(customer.tier || 'bronze', customer.points || 0);

  return (
    <div className="h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft size={20} />
          <span>{t('common.back', 'Back')}</span>
        </button>

        {/* Customer Header Card */}
        <div className="flex items-start gap-6">
          <div className={`w-24 h-24 ${getTierColor(customer.tier || 'bronze')} rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg`}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${getTierColor(customer.tier || 'bronze')}`}>
                {(customer.tier || 'bronze').toUpperCase()}
              </span>
            </div>
            <div className="flex gap-6 text-sm text-gray-600 dark:text-slate-400">
              {customer.phone && <div>📞 {customer.phone}</div>}
              {customer.email && <div>✉️ {customer.email}</div>}
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">{t('customer.totalSpent', 'Total Spent')}</div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(customer.total_spent)}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">{t('customer.points', 'Points')}</div>
                <div className="text-xl font-bold text-purple-700 dark:text-purple-300">{customer.points}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">{t('customer.visits', 'Visits')}</div>
                <div className="text-xl font-bold text-green-700 dark:text-green-300">{customer.visit_count}</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1">{t('customer.avgOrder', 'Avg Order')}</div>
                <div className="text-xl font-bold text-orange-700 dark:text-orange-300">
                  {customer.visit_count > 0 ? formatCurrency(customer.total_spent / customer.visit_count) : formatCurrency(0)}
                </div>
              </div>
            </div>
            
            {/* Store Credit Balance */}
            {(customer.credit_balance || 0) > 0 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border-2 border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-semibold">{t('storeCredit.balance', 'Store Credit Balance')}</span>
                  </div>
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(customer.credit_balance || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="flex gap-1 px-6">
          {[
            { id: 'overview', label: t('customer.overview', 'Overview'), icon: User },
            { id: 'history', label: t('customer.history', 'Purchase History'), icon: ShoppingBag },
            { id: 'loyalty', label: t('customer.loyalty', 'Loyalty'), icon: Award },
            { id: 'notes', label: t('customer.notes', 'Notes'), icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-500" />
                {t('customer.recentActivity', 'Recent Activity')}
              </h3>
              {sales.slice(0, 5).length === 0 ? (
                <p className="text-gray-500 dark:text-slate-400 text-center py-8">{t('customer.noActivity', 'No recent activity')}</p>
              ) : (
                <div className="space-y-3">
                  {sales.slice(0, 5).map(sale => (
                    <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{new Date(sale.created_at || '').toLocaleDateString()}</div>
                        <div className="text-sm text-gray-500 dark:text-slate-400">{sale.items?.length || 0} items</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(sale.total_amount)}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{sale.payment_method}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            {customer.tags && customer.tags.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Tag size={20} className="text-blue-500" />
                  {t('customer.tags', 'Tags')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
            {sales.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingBag size={64} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
                <p className="text-gray-500 dark:text-slate-400 text-lg">{t('customer.noPurchases', 'No purchases yet')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {t('customer.date', 'Date')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {t('customer.receipt', 'Receipt #')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {t('customer.items', 'Items')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {t('customer.total', 'Total')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {t('customer.payment', 'Payment')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {sales.map(sale => (
                      <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(sale.created_at || '').toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-slate-400">
                          #{sale.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {sale.items?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(sale.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                            {sale.payment_method}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'loyalty' && (
          <div className="space-y-6">
            {/* Tier Progress */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Award size={20} className="text-blue-500" />
                {t('customer.tierProgress', 'Tier Progress')}
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      {((customer.tier || 'bronze').charAt(0).toUpperCase() + (customer.tier || 'bronze').slice(1))}
                    </span>
                    {nextTier && (
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        {pointsNeeded} points to {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}
                      </span>
                    )}
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getTierColor(customer.tier || 'bronze')} transition-all duration-500`}
                      style={{ width: `${tierProgress}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{customer.points}</div>
                    <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">{t('customer.currentPoints', 'Current Points')}</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{Math.floor(customer.total_spent * 0.1)}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">{t('customer.lifetimePoints', 'Lifetime Points Earned')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tier Benefits */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Gift size={20} className="text-blue-500" />
                {t('customer.tierBenefits', 'Tier Benefits')}
              </h3>
              <div className="space-y-3">
                {(customer.tier || 'bronze') === 'bronze' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="font-medium text-amber-800 dark:text-amber-300">Bronze Benefits</div>
                    <ul className="text-sm text-amber-700 dark:text-amber-400 mt-2 space-y-1 ml-4 list-disc">
                      <li>Earn 1 point per 10 BGN spent</li>
                      <li>Access to exclusive promotions</li>
                    </ul>
                  </div>
                )}
                {(customer.tier || 'bronze') === 'silver' && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="font-medium text-gray-800 dark:text-gray-300">Silver Benefits</div>
                    <ul className="text-sm text-gray-700 dark:text-gray-400 mt-2 space-y-1 ml-4 list-disc">
                      <li>All Bronze benefits</li>
                      <li>5% discount on all purchases</li>
                      <li>Early access to sales</li>
                    </ul>
                  </div>
                )}
                {(customer.tier || 'bronze') === 'gold' && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="font-medium text-yellow-800 dark:text-yellow-300">Gold Benefits</div>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-400 mt-2 space-y-1 ml-4 list-disc">
                      <li>All Silver benefits</li>
                      <li>10% discount on all purchases</li>
                      <li>Birthday gift</li>
                      <li>Free delivery</li>
                    </ul>
                  </div>
                )}
                {(customer.tier || 'bronze') === 'platinum' && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="font-medium text-slate-800 dark:text-slate-300">Platinum Benefits</div>
                    <ul className="text-sm text-slate-700 dark:text-slate-400 mt-2 space-y-1 ml-4 list-disc">
                      <li>All Gold benefits</li>
                      <li>15% discount on all purchases</li>
                      <li>Priority customer service</li>
                      <li>Monthly exclusive gift</li>
                      <li>VIP event invitations</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                {t('customer.notesPreferences', 'Notes & Preferences')}
              </h3>
              {!isEditingNotes ? (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {t('common.edit', 'Edit')}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNotes(customer.notes || '');
                      setIsEditingNotes(false);
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {t('common.save', 'Save')}
                  </button>
                </div>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isEditingNotes}
              placeholder={t('customer.notesPlaceholder', 'Add notes about customer preferences, allergies, special requests...')}
              className="w-full h-64 p-4 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
            />
          </div>
        )}
      </div>
    </div>
  );
};
