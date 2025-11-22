import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, formatCurrency, Sale } from '@pulse/core-logic';

export const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalSales: 0,
    revenue: 0,
    lowStockCount: 0,
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all sales
      const allSales = await db.sales.toArray();
      const todaySales = allSales.filter(s => new Date(s.created_at || '') >= today);

      // Get products for low stock
      const products = await db.products.toArray();
      const lowStock = products.filter(p => p.stock_quantity <= p.min_stock_level);

      setStats({
        totalSales: todaySales.length,
        revenue: todaySales.reduce((acc, s) => acc + s.total_amount, 0),
        lowStockCount: lowStock.length,
      });

      setRecentSales(allSales.sort((a, b) => 
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      ).slice(0, 5));

    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
            <ShoppingBag size={32} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('dashboard.totalSales')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSales}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
            <DollarSign size={32} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('dashboard.revenue')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.revenue)}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
            <AlertTriangle size={32} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('dashboard.lowStock')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lowStockCount}</p>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('dashboard.recentSales')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-slate-700">
                <th className="pb-3 text-sm font-medium text-gray-500 dark:text-slate-400">ID</th>
                <th className="pb-3 text-sm font-medium text-gray-500 dark:text-slate-400">{t('common.status')}</th>
                <th className="pb-3 text-right text-sm font-medium text-gray-500 dark:text-slate-400">{t('cart.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500 dark:text-slate-400">
                    {t('dashboard.noSales')}
                  </td>
                </tr>
              ) : (
                recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="py-3 text-sm font-mono text-gray-600 dark:text-slate-300">
                      {sale.id.slice(0, 8)}...
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 capitalize">
                        {sale.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-medium text-gray-900 dark:text-white">
                      {formatCurrency(sale.total_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
