import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocationService } from '@pulse/core-logic';
import type { Location } from '@pulse/core-logic';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Building2, TrendingUp, Package, DollarSign } from 'lucide-react';

interface LocationStats {
  location: Location;
  todaySales: number;
  todayTransactions: number;
  totalStock: number;
  stockValue: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const MultiLocationDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<LocationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const locationService = new LocationService();
      const locations = await locationService.getAllLocations();

      const statsPromises = locations.map(async (location) => {
        const sales = await locationService.getLocationSales(location.id, dateRange);
        const inventory = await locationService.getLocationInventory(location.id);

        const todaySales = sales.reduce((sum, sale) => sum + sale.total, 0);
        const todayTransactions = sales.length;
        const totalStock = inventory.reduce((sum, item) => sum + item.quantity_on_hand, 0);
        const stockValue = inventory.reduce(
          (sum, item) => sum + item.quantity_on_hand * item.cost_price,
          0
        );

        return {
          location,
          todaySales,
          todayTransactions,
          totalStock,
          stockValue,
        };
      });

      const locationStats = await Promise.all(statsPromises);
      setStats(locationStats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSales = stats.reduce((sum, s) => sum + s.todaySales, 0);
  const totalTransactions = stats.reduce((sum, s) => sum + s.todayTransactions, 0);
  const totalStock = stats.reduce((sum, s) => sum + s.totalStock, 0);
  const totalStockValue = stats.reduce((sum, s) => sum + s.stockValue, 0);

  const salesByLocation = stats.map((s) => ({
    name: s.location.name,
    sales: s.todaySales,
    transactions: s.todayTransactions,
  }));

  const stockByLocation = stats.map((s) => ({
    name: s.location.name,
    value: s.stockValue,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('locations.multiLocationDashboard', 'Multi-Location Dashboard')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('locations.dashboardSubtitle', 'Real-time overview across all your business locations')}
          </p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 flex shadow-sm">
          {(['today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                dateRange === range
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {t(`common.${range}`, range.charAt(0).toUpperCase() + range.slice(1))}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('common.totalSales', 'Total Sales')}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'BGN' }).format(totalSales)}
              </h3>
            </div>
          </div>
          <div className="flex items-center text-sm text-green-600 dark:text-green-400">
            <TrendingUp size={16} className="mr-1" />
            <span>Across {stats.length} locations</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Package size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('common.transactions', 'Transactions')}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalTransactions}</h3>
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span>Processed in selected period</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('inventory.totalStock', 'Total Stock')}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalStock}</h3>
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span>Units across all locations</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('inventory.stockValue', 'Stock Value')}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'BGN', maximumFractionDigits: 0 }).format(totalStockValue)}
              </h3>
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span>Cost value of current stock</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
        {/* Sales by Location Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t('locations.salesByLocation', 'Sales by Location')}</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByLocation} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value} BGN`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`${value.toFixed(2)} BGN`, 'Sales']}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Value Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t('locations.stockValueByLocation', 'Stock Value Distribution')}</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockByLocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stockByLocation.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`${value.toFixed(2)} BGN`, 'Value']}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Location Details Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('locations.locationDetails', 'Location Details')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('locations.location', 'Location')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.sales', 'Sales')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.transactions', 'Transactions')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('inventory.totalStock', 'Total Stock')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('inventory.stockValue', 'Stock Value')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.avgTransaction', 'Avg Transaction')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {stats.map((stat) => (
                <tr key={stat.location.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg mr-3">
                        <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{stat.location.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{stat.location.address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                    {stat.todaySales.toFixed(2)} {t('common.currency')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    {stat.todayTransactions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    {stat.totalStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    {stat.stockValue.toFixed(2)} {t('common.currency')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    {stat.todayTransactions > 0
                      ? (stat.todaySales / stat.todayTransactions).toFixed(2)
                      : '0.00'}{' '}
                    {t('common.currency')}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 dark:bg-slate-700/50 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{t('common.total', 'Total')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {totalSales.toFixed(2)} {t('common.currency')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">{totalTransactions}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">{totalStock}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {totalStockValue.toFixed(2)} {t('common.currency')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {totalTransactions > 0
                    ? (totalSales / totalTransactions).toFixed(2)
                    : '0.00'}{' '}
                  {t('common.currency')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
