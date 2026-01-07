// Re-export configuration and types
export * from './currencyConfig';

import { formatMoney, MAIN_CURRENCY, CurrencyCode } from './currencyConfig';

/**
 * Format a number as currency (Alias for formatMoney for backward compatibility)
 * @param amount - The amount to format
 * @param currencyCode - ISO currency code (default: MAIN_CURRENCY)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currencyCode: string = MAIN_CURRENCY): string {
  // Cast string to CurrencyCode if it matches, otherwise default to MAIN_CURRENCY or try to use it
  // This handles the case where 'en-US' or other strings might have been passed
  const code = (currencyCode === 'BGN' || currencyCode === 'EUR') ? currencyCode : MAIN_CURRENCY;
  return formatMoney(amount, code);
}

/**
 * Parse a currency string to a number
 * @param currencyString - The currency string to parse
 * @returns Parsed number
 */
export function parseCurrency(currencyString: string): number {
  const cleaned = currencyString.replace(/[^0-9.-]+/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Calculate percentage
 * @param value - The value
 * @param total - The total
 * @returns Percentage (0-100)
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}
