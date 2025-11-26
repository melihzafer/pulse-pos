import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, DollarSign } from 'lucide-react';
import { db, formatCurrency } from '@pulse/core-logic';
import { isWithinInterval } from 'date-fns';

interface TopProductsChartProps {
  dateRange: { start: Date; end: Date };
}

interface ProductData {
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

type ViewMode = 'quantity' | 'revenue' | 'profit';

export const TopProductsChart: React.FC<TopProductsChartProps> = ({ dateRange }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('revenue');

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

      // Get all sale items
      const saleIds = allSales.map((s) => s.id);
      const allSaleItems = await db.sale_items
        .filter((item) => saleIds.includes(item.sale_id))
        .toArray();

      // Aggregate by product
      const productMap = new Map<string, ProductData>();

      allSaleItems.forEach((item) => {
        const existing = productMap.get(item.product_id);
        const itemRevenue = item.price_snapshot * item.quantity;
        const itemProfit = (item.price_snapshot - item.cost_snapshot) * item.quantity;

        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += itemRevenue;
          existing.profit += itemProfit;
        } else {
          productMap.set(item.product_id, {
            name: item.product_name_snapshot,
            quantity: item.quantity,
            revenue: itemRevenue,
            profit: itemProfit,
          });
        }
      });

      // Convert to array and get top 10
      const allProducts = Array.from(productMap.values());
      
      // Sort based on view mode
      let sortedProducts: ProductData[];
      if (viewMode === 'quantity') {
        sortedProducts = allProducts.sort((a, b) => b.quantity - a.quantity);
      } else if (viewMode === 'revenue') {
        sortedProducts = allProducts.sort((a, b) => b.revenue - a.revenue);
      } else {
        sortedProducts = allProducts.sort((a, b) => b.profit - a.profit);
      }

      setData(sortedProducts.slice(0, 10));
    } catch (error) {
      console.error('Failed to load top products data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-96 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  const getChartData = () => {
    if (viewMode === 'quantity') {
      return data.map((d) => ({ name: d.name, value: d.quantity }));
    } else if (viewMode === 'revenue') {
      return data.map((d) => ({ name: d.name, value: d.revenue }));
    } else {
      return data.map((d) => ({ name: d.name, value: d.profit }));
    }
  };

  const getValueFormatter = (value: number) => {
    if (viewMode === 'quantity') {
      return `${value} units`;
    }
    return formatCurrency(value);
  };

  const getTitle = () => {
    if (viewMode === 'quantity') return t('analytics.topProducts.byVolume');
    if (viewMode === 'revenue') return t('analytics.topProducts.byRevenue');
    return t('analytics.topProducts.byProfit');
  };

  const getIcon = () => {
    if (viewMode === 'quantity') return <Package size={20} className="text-blue-600" />;
    if (viewMode === 'revenue') return <DollarSign size={20} className="text-green-600" />;
    return <TrendingUp size={20} className="text-purple-600" />;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('analytics.topProducts.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('quantity')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              viewMode === 'quantity'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {t('analytics.topProducts.volume')}
          </button>
          <button
            onClick={() => setViewMode('revenue')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              viewMode === 'revenue'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {t('analytics.topProducts.revenue')}
          </button>
          <button
            onClick={() => setViewMode('profit')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              viewMode === 'profit'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {t('analytics.topProducts.profit')}
          </button>
        </div>
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Package size={48} className="mx-auto mb-3 opacity-50" />
            <p>{t('analytics.topProducts.noData')}</p>
          </div>
        </div>
      ) : (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getChartData()} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value: number) => viewMode === 'quantity' ? value : `${value} BGN`}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={150}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [getValueFormatter(value), '']}
              />
              <Bar
                dataKey="value"
                fill={viewMode === 'quantity' ? '#3b82f6' : viewMode === 'revenue' ? '#10b981' : '#8b5cf6'}
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Data Table */}
      {data.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                <th className="pb-3 font-semibold">{t('analytics.topProducts.product')}</th>
                <th className="pb-3 font-semibold text-right">{t('analytics.topProducts.qtySold')}</th>
                <th className="pb-3 font-semibold text-right">{t('analytics.topProducts.revenue')}</th>
                <th className="pb-3 font-semibold text-right">{t('analytics.topProducts.profit')}</th>
                <th className="pb-3 font-semibold text-right">{t('analytics.topProducts.margin')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((product, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-slate-700 last:border-0"
                >
                  <td className="py-3 text-gray-900 dark:text-white font-medium">
                    {product.name}
                  </td>
                  <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                    {product.quantity}
                  </td>
                  <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(product.revenue)}
                  </td>
                  <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(product.profit)}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        product.revenue > 0 && (product.profit / product.revenue) * 100 > 30
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : product.revenue > 0 && (product.profit / product.revenue) * 100 > 15
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {product.revenue > 0 ? ((product.profit / product.revenue) * 100).toFixed(1) : '0'}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
