/**
 * Currency Configuration for Pulse POS
 *
 * This file contains all currency-related constants and configuration.
 * The system uses EUR as the main currency with BGN as secondary (for Bulgarian Euro adoption).
 *
 * The fixed rate is the official EUR/BGN conversion rate set by the Bulgarian National Bank.
 */

// ============================================================================
// CURRENCY CODES
// ============================================================================

export type CurrencyCode = 'EUR' | 'BGN';

export const MAIN_CURRENCY: CurrencyCode = 'EUR';
export const SECONDARY_CURRENCY: CurrencyCode = 'BGN';

// ============================================================================
// CONVERSION RATE
// ============================================================================

/**
 * Fixed EUR to BGN conversion rate.
 * This is the official fixed exchange rate for Bulgarian Euro adoption.
 * 1 EUR = 1.95583 BGN
 */
export const FIXED_RATE_EUR_TO_BGN = 1.95583;

/**
 * @deprecated Use FIXED_RATE_EUR_TO_BGN instead. Kept for backward compatibility.
 */
export const FIXED_RATE = FIXED_RATE_EUR_TO_BGN;

// ============================================================================
// CURRENCY SYMBOLS
// ============================================================================

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: '\u20AC',
  BGN: '\u043B\u0432',
};

// ============================================================================
// LOCALE MAPPINGS
// ============================================================================

export const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  EUR: 'de-DE',
  BGN: 'bg-BG',
};

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert EUR to BGN
 * @param eurAmount - Amount in EUR
 * @returns Amount in BGN
 */
export function eurToBgn(eurAmount: number): number {
  return eurAmount * FIXED_RATE_EUR_TO_BGN;
}

/**
 * Convert BGN to EUR
 * @param bgnAmount - Amount in BGN
 * @returns Amount in EUR
 */
export function bgnToEur(bgnAmount: number): number {
  return bgnAmount / FIXED_RATE_EUR_TO_BGN;
}

/**
 * Convert amount between currencies
 * @param amount - The amount to convert
 * @param from - Source currency
 * @param to - Target currency
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (from === to) return amount;
  if (from === 'EUR' && to === 'BGN') return eurToBgn(amount);
  if (from === 'BGN' && to === 'EUR') return bgnToEur(amount);
  return amount;
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format amount as currency string
 * @param amount - The amount to format
 * @param currency - Currency code (default: EUR)
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted currency string
 */
export function formatMoney(
  amount: number,
  currency: CurrencyCode = MAIN_CURRENCY,
  options?: Partial<Intl.NumberFormatOptions>
): string {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/**
 * Format amount in both currencies (for dual currency display)
 * @param eurAmount - Amount in EUR
 * @returns Object with formatted strings for both currencies
 */
export function formatDualCurrency(eurAmount: number): {
  main: string;
  secondary: string;
  mainAmount: number;
  secondaryAmount: number;
} {
  const bgnAmount = eurToBgn(eurAmount);
  return {
    main: formatMoney(eurAmount, 'EUR'),
    secondary: formatMoney(bgnAmount, 'BGN'),
    mainAmount: eurAmount,
    secondaryAmount: bgnAmount,
  };
}

// ============================================================================
// DISPLAY CONFIGURATION
// ============================================================================

export interface CurrencyDisplayConfig {
  mainCurrency: CurrencyCode;
  secondaryCurrency: CurrencyCode;
  showDualDisplay: boolean;
  fixedRate: number;
  rateLabel: string;
}

export function getCurrencyDisplayConfig(showDualDisplay: boolean): CurrencyDisplayConfig {
  return {
    mainCurrency: MAIN_CURRENCY,
    secondaryCurrency: SECONDARY_CURRENCY,
    showDualDisplay,
    fixedRate: FIXED_RATE_EUR_TO_BGN,
    rateLabel: `1 EUR = ${FIXED_RATE_EUR_TO_BGN} BGN`,
  };
}
