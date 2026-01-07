import React from 'react';
import {
  formatMoney,
  eurToBgn,
  MAIN_CURRENCY,
  SECONDARY_CURRENCY,
  FIXED_RATE_EUR_TO_BGN,
  useSettingsStore,
} from '@pulse/core-logic';
import clsx from 'clsx';

interface DualCurrencyDisplayProps {
  /** Amount in EUR (main currency) */
  amount: number;
  /** Additional CSS classes for the container */
  className?: string;
  /** Size of the main currency display */
  mainSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  /** Size of the secondary currency display */
  secondarySize?: 'xs' | 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'default' | 'gradient' | 'compact' | 'pill';
  /** Show the exchange rate info */
  showRate?: boolean;
  /** Layout direction */
  layout?: 'vertical' | 'horizontal';
  /** Force show dual display regardless of settings */
  forceShow?: boolean;
}

const mainSizeClasses: Record<string, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
};

const secondarySizeClasses: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

/**
 * DualCurrencyDisplay - Shows amount in both EUR (main) and BGN (secondary)
 * Respects the enableDualCurrencyDisplay setting from the settings store
 */
export const DualCurrencyDisplay: React.FC<DualCurrencyDisplayProps> = ({
  amount,
  className,
  mainSize = '2xl',
  secondarySize = 'sm',
  variant = 'default',
  showRate = false,
  layout = 'vertical',
  forceShow = false,
}) => {
  const { enableDualCurrencyDisplay } = useSettingsStore();
  const showSecondary = forceShow || enableDualCurrencyDisplay;

  const eurAmount = amount;
  const bgnAmount = eurToBgn(amount);

  const mainCurrencyFormatted = formatMoney(eurAmount, MAIN_CURRENCY);
  const secondaryCurrencyFormatted = formatMoney(bgnAmount, SECONDARY_CURRENCY);

  if (variant === 'compact') {
    return (
      <div className={clsx('flex flex-col items-end', className)}>
        <span className={clsx(mainSizeClasses[mainSize], 'font-mono font-bold text-gray-900 dark:text-white')}>
          {mainCurrencyFormatted}
        </span>
        {showSecondary && (
          <span className={clsx(secondarySizeClasses[secondarySize], 'font-mono text-gray-500 dark:text-slate-400')}>
            {secondaryCurrencyFormatted}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div className={clsx('flex flex-col items-center', className)}>
        <span
          className={clsx(
            mainSizeClasses[mainSize],
            'font-mono font-bold text-blue-600 dark:text-blue-400'
          )}
        >
          {mainCurrencyFormatted}
        </span>
        {showSecondary && (
          <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
            <span className={clsx(secondarySizeClasses[secondarySize], 'font-semibold text-gray-600 dark:text-slate-300 font-mono')}>
              {secondaryCurrencyFormatted}
            </span>
            {showRate && (
              <span className="text-xs text-gray-400">
                (1 EUR = {FIXED_RATE_EUR_TO_BGN} BGN)
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'gradient') {
    return (
      <div className={clsx(layout === 'horizontal' ? 'flex items-baseline gap-3' : 'flex flex-col', className)}>
        <span
          className={clsx(
            mainSizeClasses[mainSize],
            'font-mono font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent'
          )}
        >
          {mainCurrencyFormatted}
        </span>
        {showSecondary && (
          <span className={clsx(secondarySizeClasses[secondarySize], 'font-mono text-gray-500 dark:text-slate-400')}>
            {secondaryCurrencyFormatted}
          </span>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={clsx(layout === 'horizontal' ? 'flex items-baseline gap-3' : 'flex flex-col', className)}>
      <span className={clsx(mainSizeClasses[mainSize], 'font-mono font-bold text-gray-900 dark:text-white')}>
        {mainCurrencyFormatted}
      </span>
      {showSecondary && (
        <span className={clsx(secondarySizeClasses[secondarySize], 'font-mono text-gray-500 dark:text-slate-400')}>
          {secondaryCurrencyFormatted}
        </span>
      )}
    </div>
  );
};

export default DualCurrencyDisplay;
