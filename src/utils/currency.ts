import { AppSettings } from '../types';

export const CURRENCY_SYMBOLS: Record<AppSettings['currency'], string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£'
};

export const CURRENCY_LOCALES: Record<AppSettings['currency'], string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB'
};

/**
 * Pure currency formatter -- extracted from the `useCurrency` hook so
 * non-component code (background notification services) can format amounts
 * without needing a React context.
 */
export function formatCurrency(value: number, currency: AppSettings['currency'], options?: Intl.NumberFormatOptions): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const locale = CURRENCY_LOCALES[currency];
  const formatted = Math.abs(value).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  });
  return `${value < 0 ? '-' : ''}${symbol}${formatted}`;
}
