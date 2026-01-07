import React from 'react';
import { formatMoney, type CurrencyCode, MAIN_CURRENCY } from '@pulse/core-logic';
import clsx from 'clsx';

interface CurrencyDisplayProps {
  amount: number;
  currency?: CurrencyCode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  variant?: 'default' | 'gradient' | 'success' | 'error' | 'muted';
  mono?: boolean;
}

const sizeClasses: Record<NonNullable<CurrencyDisplayProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
};

const variantClasses: Record<NonNullable<CurrencyDisplayProps['variant']>, string> = {
  default: 'text-gray-900 dark:text-white',
  gradient: 'bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent',
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  muted: 'text-gray-500 dark:text-slate-400',
};

/**
 * CurrencyDisplay - A reusable component for displaying formatted currency amounts
 */
export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency = MAIN_CURRENCY,
  className,
  size = 'md',
  variant = 'default',
  mono = true,
}) => {
  return (
    <span
      className={clsx(
        sizeClasses[size],
        variantClasses[variant],
        mono && 'font-mono',
        'font-bold',
        className
      )}
    >
      {formatMoney(amount, currency)}
    </span>
  );
};

export default CurrencyDisplay;
