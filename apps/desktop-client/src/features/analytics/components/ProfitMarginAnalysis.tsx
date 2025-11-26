import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingDown, AlertCircle } from 'lucide-react';
import { db, formatCurrency } from '@pulse/core-logic';
import { isWithinInterval } from 'date-fns';

interface ProfitMarginAnalysisProps {
  dateRange: { start: Date; end: Date };
}

interface MarginData {
  category: string;
  profit: number;
  revenue: number;
  margin: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const ProfitMarginAnalysis: React.FC<ProfitMarginAnalysisProps> = ({ dateRange }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<MarginData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [lowMarginProducts, setLowMarginProducts] = useState<string[]>([]);

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

      // Calculate total profit and revenue
      let totalProfitCalc = 0;
      let totalRevenueCalc = 0;
      const lowMargin: string[] = [];

      allSaleItems.forEach((item) => {
        const itemRevenue = item.price_snapshot * item.quantity;
        const itemProfit = (item.price_snapshot - item.cost_snapshot) * item.quantity;
        totalRevenueCalc += itemRevenue;
        totalProfitCalc += itemProfit;

        // Check for low margin (< 15%)
        const margin = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0;
        if (margin < 15 && margin > 0) {
          lowMargin.push(item.product_name_snapshot);
        }
      });

      setTotalProfit(totalProfitCalc);
      setTotalRevenue(totalRevenueCalc);
      setLowMarginProducts([...new Set(lowMargin)].slice(0, 5));

      // Group by product for pie chart (top 6 by profit)
      const productMap = new Map<string, { profit: number; revenue: number }>();

      allSaleItems.forEach((item) => {
        const existing = productMap.get(item.product_name_snapshot);
        const itemRevenue = item.price_snapshot * item.quantity;
        const itemProfit = (item.price_snapshot - item.cost_snapshot) * item.quantity;

        if (existing) {
          existing.profit += itemProfit;
          existing.revenue += itemRevenue;
        } else {
          productMap.set(item.product_name_snapshot, {
            profit: itemProfit,
            revenue: itemRevenue,
          });
        }
      });

      const marginData: MarginData[] = Array.from(productMap.entries())
        .map(([name, data]) => ({
          category: name,
          profit: data.profit,
          revenue: data.revenue,
          margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 6);

      setData(marginData);
    } catch (error) {
      console.error('Failed to load profit margin data:', error);
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
          <div className="h-80 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingDown size={20} className="text-purple-600" />
          {t('analytics.profitMargin.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('analytics.profitMargin.subtitle')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
          <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
            {t('analytics.profitMargin.totalProfit')}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalProfit)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
            {t('analytics.profitMargin.totalRevenue')}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalRevenue)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
          <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
            {t('analytics.profitMargin.overallMargin')}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {overallMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            {t('analytics.profitMargin.profitDistribution')}
          </h4>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data as unknown as Record<string, unknown>[]}
                  dataKey="profit"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: MarginData) => `${entry.margin.toFixed(1)}%`}
                >
                  {data.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No data available
            </div>
          )}
        </div>

        {/* Low Margin Alert */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-orange-600" />
            {t('analytics.profitMargin.lowMarginProducts')}
          </h4>
          {lowMarginProducts.length > 0 ? (
            <div className="space-y-2">
              {lowMarginProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
                >
                  <AlertCircle size={18} className="text-orange-600 flex-shrink-0" />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {product}
                  </span>
                </div>
              ))}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-300">
                  💡 <strong>Tip:</strong> {t('analytics.profitMargin.tip')}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <p className="text-sm text-green-900 dark:text-green-300">
                {t('analytics.profitMargin.allHealthy')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
