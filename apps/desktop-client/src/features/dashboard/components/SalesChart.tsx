import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sale } from '@pulse/core-logic';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface SalesChartProps {
  sales: Sale[];
  days?: number;
}

export const SalesChart: React.FC<SalesChartProps> = ({ sales, days = 7 }) => {
  const { t } = useTranslation();

  const data = useMemo(() => {
    const today = new Date();
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const start = startOfDay(date);
      const end = endOfDay(date);
      
      const daySales = sales.filter(s => {
        if (!s.created_at) return false;
        const saleDate = new Date(s.created_at);
        return isWithinInterval(saleDate, { start, end });
      });

      const total = daySales.reduce((acc, curr) => acc + curr.total_amount, 0);

      result.push({
        date: format(date, 'MMM dd'),
        total,
        count: daySales.length
      });
    }
    return result;
  }, [sales, days]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          <p className="text-blue-600 dark:text-blue-400 font-bold">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BGN' }).format(payload[0].value)}
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {payload[0].payload.count} {t('dashboard.salesCount', 'sales')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="total" 
            stroke="#3b82f6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorTotal)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
