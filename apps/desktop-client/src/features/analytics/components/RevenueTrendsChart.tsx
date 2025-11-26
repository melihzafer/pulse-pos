import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';
import { db, formatCurrency } from '@pulse/core-logic';
import { format, eachDayOfInterval, startOfDay, isWithinInterval } from 'date-fns';

interface RevenueTrendsChartProps {
  dateRange: { start: Date; end: Date };
}

interface ChartData {
  date: string;
  revenue: number;
  transactions: number;
}

export const RevenueTrendsChart: React.FC<RevenueTrendsChartProps> = ({ dateRange }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [paymentBreakdown, setPaymentBreakdown] = useState<Record<string, number>>({});

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

      // Calculate totals
      const revenue = allSales.reduce((sum, sale) => sum + sale.total_amount, 0);
      setTotalRevenue(revenue);
      setTotalTransactions(allSales.length);

      // Payment method breakdown
      const breakdown: Record<string, number> = {};
      allSales.forEach((sale) => {
        breakdown[sale.payment_method] = (breakdown[sale.payment_method] || 0) + sale.total_amount;
      });
      setPaymentBreakdown(breakdown);

      // Group by date
      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      const chartData: ChartData[] = days.map((day) => {
        const dayStart = startOfDay(day);
        const daySales = allSales.filter((sale) => {
          const saleDate = startOfDay(new Date(sale.created_at || ''));
          return saleDate.getTime() === dayStart.getTime();
        });

        return {
          date: format(day, 'MMM d'),
          revenue: daySales.reduce((sum, sale) => sum + sale.total_amount, 0),
          transactions: daySales.length,
        };
      });

      setData(chartData);
    } catch (error) {
      console.error('Failed to load revenue data:', error);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            {t('analytics.revenueTrends.title')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('analytics.revenueTrends.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {t('analytics.revenueTrends.line')}
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              chartType === 'bar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {t('analytics.revenueTrends.bar')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <DollarSign size={18} />
            <span className="text-sm font-medium">{t('analytics.revenueTrends.totalRevenue')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalRevenue)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <TrendingUp size={18} />
            <span className="text-sm font-medium">{t('analytics.revenueTrends.transactions')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalTransactions}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
            <DollarSign size={18} />
            <span className="text-sm font-medium">{t('analytics.revenueTrends.avgTransaction')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalTransactions > 0 ? totalRevenue / totalTransactions : 0)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value: number) => `${value} BGN`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value.toFixed(2)} BGN`, 'Revenue']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Revenue (BGN)"
              />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value: number) => `${value} BGN`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value.toFixed(2)} BGN`, 'Revenue']}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (BGN)" radius={[8, 8, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Payment Method Breakdown */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Revenue by Payment Method
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(paymentBreakdown).map(([method, amount]) => (
            <div key={method} className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                {method}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
