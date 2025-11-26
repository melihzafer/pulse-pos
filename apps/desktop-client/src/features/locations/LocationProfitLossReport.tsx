import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocationService } from '@pulse/core-logic';
import type { Location } from '@pulse/core-logic';
import { Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LocationPL {
  location: Location;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  transactionCount: number;
}

export const LocationProfitLossReport: React.FC = () => {
  const { t } = useTranslation();
  const [plData, setPLData] = useState<LocationPL[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadPLData();
  }, [startDate, endDate]);

  const loadPLData = async () => {
    try {
      setLoading(true);
      const locationService = new LocationService();
      const locations = await locationService.getAllLocations();

      const plPromises = locations.map(async (location) => {
        const sales = await locationService.getLocationSalesInRange(
          location.id,
          startDate,
          endDate
        );

        const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const cogs = sales.reduce((sum, sale) => {
          return (
            sum +
            sale.items.reduce((itemSum: number, item: any) => {
              return itemSum + (item.cost_snapshot || 0) * item.quantity;
            }, 0)
          );
        }, 0);

        const grossProfit = revenue - cogs;
        const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

        return {
          location,
          revenue,
          cogs,
          grossProfit,
          grossMargin,
          transactionCount: sales.length,
        };
      });

      const locationPL = await Promise.all(plPromises);
      setPLData(locationPL);
    } catch (error) {
      console.error('Failed to load P&L data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = plData.reduce((sum, pl) => sum + pl.revenue, 0);
  const totalCOGS = plData.reduce((sum, pl) => sum + pl.cogs, 0);
  const totalGrossProfit = totalRevenue - totalCOGS;
  const totalGrossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  const totalTransactions = plData.reduce((sum, pl) => sum + pl.transactionCount, 0);

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Pulse POS - Profit & Loss Report'],
      ['Period:', `${startDate} to ${endDate}`],
      [''],
      ['Location', 'Revenue', 'COGS', 'Gross Profit', 'Gross Margin %', 'Transactions'],
      ...plData.map((pl) => [
        pl.location.name,
        pl.revenue.toFixed(2),
        pl.cogs.toFixed(2),
        pl.grossProfit.toFixed(2),
        pl.grossMargin.toFixed(2),
        pl.transactionCount,
      ]),
      [''],
      [
        'TOTAL',
        totalRevenue.toFixed(2),
        totalCOGS.toFixed(2),
        totalGrossProfit.toFixed(2),
        totalGrossMargin.toFixed(2),
        totalTransactions,
      ],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Individual location sheets
    plData.forEach((pl) => {
      const locationData = [
        [`${pl.location.name} - Detailed P&L`],
        ['Period:', `${startDate} to ${endDate}`],
        [''],
        ['Metric', 'Amount', 'Percentage'],
        ['Revenue', pl.revenue.toFixed(2), '100.00%'],
        ['Cost of Goods Sold', pl.cogs.toFixed(2), ((pl.cogs / pl.revenue) * 100).toFixed(2) + '%'],
        ['Gross Profit', pl.grossProfit.toFixed(2), pl.grossMargin.toFixed(2) + '%'],
        [''],
        ['Transactions', pl.transactionCount],
        ['Average Transaction', (pl.revenue / pl.transactionCount).toFixed(2)],
      ];

      const locationSheet = XLSX.utils.aoa_to_sheet(locationData);
      XLSX.utils.book_append_sheet(workbook, locationSheet, pl.location.name.substring(0, 31));
    });

    // Write file
    XLSX.writeFile(workbook, `PL_Report_${startDate}_to_${endDate}.xlsx`);
  };

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
            {t('locations.profitLossReport', 'Profit & Loss Report')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('locations.plReportSubtitle', 'Financial performance analysis by location')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center shadow-sm">
            <div className="flex items-center px-3 border-r border-gray-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Period</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-transparent border-none text-sm text-gray-900 dark:text-white focus:ring-0"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-transparent border-none text-sm text-gray-900 dark:text-white focus:ring-0"
            />
          </div>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            {t('common.exportExcel', 'Export Excel')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.totalRevenue', 'Total Revenue')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'BGN' }).format(totalRevenue)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.totalCOGS', 'Total COGS')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'BGN' }).format(totalCOGS)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.grossProfit', 'Gross Profit')}</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'BGN' }).format(totalGrossProfit)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.grossMargin', 'Gross Margin')}</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalGrossMargin.toFixed(2)}%</p>
        </div>
      </div>

      {/* P&L Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('locations.location', 'Location')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.revenue', 'Revenue')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.cogs', 'COGS')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.grossProfit', 'Gross Profit')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.grossMargin', 'Margin')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.transactions', 'Txns')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.avgTransaction', 'Avg Txn')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {plData.map((pl) => (
                <tr key={pl.location.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">{pl.location.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{pl.location.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {pl.revenue.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {pl.cogs.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {pl.grossProfit.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-600 dark:text-blue-400">
                    {pl.grossMargin.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    {pl.transactionCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    {pl.transactionCount > 0
                      ? (pl.revenue / pl.transactionCount).toFixed(2)
                      : '0.00'}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 dark:bg-slate-700/50 font-bold">
                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{t('common.total', 'Total')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {totalRevenue.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {totalCOGS.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-emerald-600 dark:text-emerald-400">
                  {totalGrossProfit.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600 dark:text-blue-400">
                  {totalGrossMargin.toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {totalTransactions}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : '0.00'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('locations.topPerformers', 'Top Performers (Revenue)')}</h3>
          <div className="space-y-4">
            {[...plData]
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 3)
              .map((pl, index) => (
                <div key={pl.location.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : index === 1
                          ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{pl.location.name}</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {pl.revenue.toFixed(2)} <span className="text-xs text-gray-500 font-normal">BGN</span>
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('locations.highestMargins', 'Highest Margins')}</h3>
          <div className="space-y-4">
            {[...plData]
              .sort((a, b) => b.grossMargin - a.grossMargin)
              .slice(0, 3)
              .map((pl, index) => (
                <div key={pl.location.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : index === 1
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{pl.location.name}</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {pl.grossMargin.toFixed(2)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
