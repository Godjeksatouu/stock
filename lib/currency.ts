/**
 * Currency utility functions for the stock management application
 * Handles formatting prices in Moroccan Dirham (DH)
 */

/**
 * Format a number as currency in Moroccan Dirham
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the currency symbol (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string, showSymbol: boolean = true): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return showSymbol ? '0.00 DH' : '0.00';
  }
  
  const formatted = numericAmount.toFixed(2);
  return showSymbol ? `${formatted} DH` : formatted;
}

/**
 * Format currency for display in tables and lists
 * @param amount - The amount to format
 * @returns Formatted currency string with DH symbol
 */
export function formatPrice(amount: number | string): string {
  return formatCurrency(amount, true);
}

/**
 * Get the currency symbol
 * @returns The currency symbol (DH)
 */
export function getCurrencySymbol(): string {
  return 'DH';
}

/**
 * Get the currency name
 * @returns The currency name
 */
export function getCurrencyName(): string {
  return 'Dirham';
}

/**
 * Parse a currency string to number
 * @param currencyString - String like "123.45 DH" or "123.45"
 * @returns Numeric value
 */
export function parseCurrency(currencyString: string): number {
  if (typeof currencyString === 'number') {
    return currencyString;
  }
  
  // Remove currency symbol and spaces, then parse
  const cleaned = currencyString.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}
