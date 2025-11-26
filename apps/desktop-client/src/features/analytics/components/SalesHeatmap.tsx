import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { db } from '@pulse/core-logic';
import { isWithinInterval, getHours, getDay } from 'date-fns';

interface SalesHeatmapProps {
  dateRange: { start: Date; end: Date };
}

interface HeatmapData {
  hour: number;
  day: number;
  sales: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const SalesHeatmap: React.FC<SalesHeatmapProps> = ({ dateRange }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxSales, setMaxSales] = useState(0);

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

      // Create a map to count sales by hour and day
      const heatmapMap = new Map<string, number>();
      let max = 0;

      allSales.forEach((sale) => {
        const saleDate = new Date(sale.created_at || '');
        const hour = getHours(saleDate);
        const day = getDay(saleDate);
        const key = `${day}-${hour}`;

        const count = (heatmapMap.get(key) || 0) + 1;
        heatmapMap.set(key, count);
        if (count > max) max = count;
      });

      setMaxSales(max);

      // Convert to array
      const heatmapData: HeatmapData[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const key = `${day}-${hour}`;
          heatmapData.push({
            day,
            hour,
            sales: heatmapMap.get(key) || 0,
          });
        }
      }

      setData(heatmapData);
    } catch (error) {
      console.error('Failed to load heatmap data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getColorIntensity = (sales: number): string => {
    if (sales === 0) return 'bg-gray-100 dark:bg-slate-700';
    const intensity = Math.min(sales / maxSales, 1);
    
    if (intensity < 0.2) return 'bg-blue-100 dark:bg-blue-900/30';
    if (intensity < 0.4) return 'bg-blue-200 dark:bg-blue-800/50';
    if (intensity < 0.6) return 'bg-blue-400 dark:bg-blue-700';
    if (intensity < 0.8) return 'bg-blue-500 dark:bg-blue-600';
    return 'bg-blue-600 dark:bg-blue-500';
  };

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
          <Clock size={20} className="text-blue-600" />
          {t('analytics.salesHeatmap.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('analytics.salesHeatmap.subtitle')}
        </p>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour labels */}
          <div className="flex mb-2">
            <div className="w-12 flex-shrink-0" /> {/* Space for day labels */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="w-6 text-center text-xs text-gray-600 dark:text-gray-400"
                title={`${hour}:00`}
              >
                {hour % 3 === 0 ? hour : ''}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {DAYS.map((dayLabel, dayIndex) => (
            <div key={dayIndex} className="flex mb-1">
              {/* Day label */}
              <div className="w-12 flex-shrink-0 text-xs text-gray-600 dark:text-gray-400 flex items-center">
                {dayLabel}
              </div>

              {/* Hour cells */}
              {HOURS.map((hour) => {
                const cellData = data.find((d) => d.day === dayIndex && d.hour === hour);
                const sales = cellData?.sales || 0;

                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className={`w-6 h-6 rounded-sm ${getColorIntensity(sales)} cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all`}
                    title={`${dayLabel} ${hour}:00 - ${sales} sales`}
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <span className="text-xs text-gray-600 dark:text-gray-400">{t('analytics.salesHeatmap.less')}</span>
            <div className="flex gap-1">
              <div className="w-6 h-6 rounded-sm bg-gray-100 dark:bg-slate-700" />
              <div className="w-6 h-6 rounded-sm bg-blue-100 dark:bg-blue-900/30" />
              <div className="w-6 h-6 rounded-sm bg-blue-200 dark:bg-blue-800/50" />
              <div className="w-6 h-6 rounded-sm bg-blue-400 dark:bg-blue-700" />
              <div className="w-6 h-6 rounded-sm bg-blue-500 dark:bg-blue-600" />
              <div className="w-6 h-6 rounded-sm bg-blue-600 dark:bg-blue-500" />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">{t('analytics.salesHeatmap.more')}</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      {maxSales > 0 && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-300">
            💡 <strong>{t('analytics.salesHeatmap.peakActivity')}</strong> {maxSales} {t('analytics.salesHeatmap.salesInHour')}
          </p>
        </div>
      )}
    </div>
  );
};
