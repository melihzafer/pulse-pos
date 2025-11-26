import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { db, formatCurrency } from '@pulse/core-logic';
import { isWithinInterval } from 'date-fns';

interface CashierPerformanceProps {
  dateRange: { start: Date; end: Date };
}

interface CashierStats {
  userId: string;
  salesCount: number;
  revenue: number;
  avgTransaction: number;
  itemsPerTransaction: number;
}

export const CashierPerformance: React.FC<CashierPerformanceProps> = ({ dateRange }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<CashierStats[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      // Get all sales within date range
      const allSales = await db.sales
        .filter((sale) => {
          const saleDate = new Date(sale.created_at || '');
          return isWithinInterval(saleDate, { start: dateRange.start, end: dateRange.end });
        })
        .toArray();

      // Group by user_id
      const userMap = new Map<string, { sales: typeof allSales; totalItems: number }>();

      for (const sale of allSales) {
        const userId = sale.user_id || 'Unknown';
        const existing = userMap.get(userId);

        // Get items for this sale
        const items = await db.sale_items.where('sale_id').equals(sale.id).toArray();
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

        if (existing) {
          existing.sales.push(sale);
          existing.totalItems += itemCount;
        } else {
          userMap.set(userId, { sales: [sale], totalItems: itemCount });
        }
      }

      // Calculate stats
      const stats: CashierStats[] = Array.from(userMap.entries()).map(([userId, data]) => {
        const revenue = data.sales.reduce((sum, s) => sum + s.total_amount, 0);
        const salesCount = data.sales.length;

        return {
          userId,
          salesCount,
          revenue,
          avgTransaction: salesCount > 0 ? revenue / salesCount : 0,
          itemsPerTransaction: salesCount > 0 ? data.totalItems / salesCount : 0,
        };
      });

      // Sort by revenue
      stats.sort((a, b) => b.revenue - a.revenue);

      setData(stats);
    } catch (error) {
      console.error('Failed to load cashier performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users size={20} className="text-purple-600" />
          {t('analytics.cashierPerformance.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('analytics.cashierPerformance.subtitle')}
        </p>
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          <Users size={48} className="mx-auto mb-3 opacity-50" />
          <p>{t('analytics.cashierPerformance.noData')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Leaderboard */}
          {data.map((cashier, index) => (
            <div
              key={cashier.userId}
              className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm ${
                      index === 0
                        ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white'
                        : index === 1
                        ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
                        : index === 2
                        ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    #{index + 1}
                  </div>

                  {/* User Info */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {cashier.userId === 'Unknown' ? t('analytics.cashierPerformance.unknownUser') : `User ${cashier.userId.slice(0, 8)}`}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('analytics.cashierPerformance.cashier')}
                    </p>
                  </div>
                </div>

                {/* Total Revenue */}
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.cashierPerformance.totalRevenue')}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(cashier.revenue)}
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-700">
                  <ShoppingCart size={16} className="mx-auto text-blue-600 mb-1" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('analytics.cashierPerformance.transactions')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {cashier.salesCount}
                  </p>
                </div>

                <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-700">
                  <DollarSign size={16} className="mx-auto text-green-600 mb-1" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('analytics.cashierPerformance.avgTransaction')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(cashier.avgTransaction)}
                  </p>
                </div>

                <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-700">
                  <TrendingUp size={16} className="mx-auto text-purple-600 mb-1" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('analytics.cashierPerformance.itemsPerSale')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {cashier.itemsPerTransaction.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
