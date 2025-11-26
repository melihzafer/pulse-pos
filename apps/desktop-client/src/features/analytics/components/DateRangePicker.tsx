import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface DateRangePickerProps {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
}

type Preset = {
  label: string;
  getValue: () => { start: Date; end: Date };
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const presets: Preset[] = [
    {
      label: t('analytics.dateRange.today'),
      getValue: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }),
    },
    {
      label: t('analytics.dateRange.yesterday'),
      getValue: () => {
        const yesterday = subDays(new Date(), 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      },
    },
    {
      label: t('analytics.dateRange.last7Days'),
      getValue: () => ({ start: startOfDay(subDays(new Date(), 6)), end: endOfDay(new Date()) }),
    },
    {
      label: t('analytics.dateRange.last30Days'),
      getValue: () => ({ start: startOfDay(subDays(new Date(), 29)), end: endOfDay(new Date()) }),
    },
    {
      label: t('analytics.dateRange.thisWeek'),
      getValue: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }),
    },
    {
      label: t('analytics.dateRange.thisMonth'),
      getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }),
    },
    {
      label: t('analytics.dateRange.thisYear'),
      getValue: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) }),
    },
  ];

  const handlePresetClick = (preset: Preset) => {
    onChange(preset.getValue());
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
      >
        <Calendar size={18} className="text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {format(value.start, 'MMM d, yyyy')} - {format(value.end, 'MMM d, yyyy')}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-2">
            <div className="space-y-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
