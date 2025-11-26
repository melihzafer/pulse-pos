import React, { useState } from 'react';
import { BarChart3, Users, Clock, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DateRangePicker } from './components/DateRangePicker';
import { RevenueTrendsChart } from './components/RevenueTrendsChart';
import { TopProductsChart } from './components/TopProductsChart';
import { ProfitMarginAnalysis } from './components/ProfitMarginAnalysis';
import { SalesHeatmap } from './components/SalesHeatmap';
import { CashierPerformance } from './components/CashierPerformance';
import { LowStockAlerts } from './components/LowStockAlerts';
import { ReportExporter } from './components/ReportExporter';
import { startOfDay, endOfDay } from 'date-fns';

export const AnalyticsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'performance' | 'inventory'>('overview');

  const tabs = [
    { id: 'overview', label: t('analytics.tabs.overview'), icon: BarChart3 },
    { id: 'products', label: t('analytics.tabs.products'), icon: Package },
    { id: 'performance', label: t('analytics.tabs.performance'), icon: Users },
    { id: 'inventory', label: t('analytics.tabs.inventory'), icon: Clock },
  ] as const;

  return (
    <div className="h-full flex flex-col">
      {/* Header with Date Range Picker and Export */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('analytics.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('analytics.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <ReportExporter dateRange={dateRange} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-all duration-200
              border-b-2 -mb-px
              ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }
            `}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <RevenueTrendsChart dateRange={dateRange} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesHeatmap dateRange={dateRange} />
              <LowStockAlerts />
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <TopProductsChart dateRange={dateRange} />
            <ProfitMarginAnalysis dateRange={dateRange} />
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <CashierPerformance dateRange={dateRange} />
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <LowStockAlerts />
          </div>
        )}
      </div>
    </div>
  );
};
