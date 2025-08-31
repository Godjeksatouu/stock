/**
 * Utility functions for barcode validation and processing
 */

export interface BarcodeValidationResult {
  isValid: boolean;
  cleanedBarcode?: string;
  error?: string;
}

/**
 * Validates a barcode format and returns validation result
 */
export function validateBarcode(barcode: string): BarcodeValidationResult {
  if (!barcode || typeof barcode !== 'string') {
    return {
      isValid: false,
      error: 'Code-barres requis'
    };
  }

  const cleaned = barcode.trim();

  if (!cleaned) {
    return {
      isValid: false,
      error: 'Code-barres ne peut pas être vide'
    };
  }

  // Check if barcode contains only digits
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Format de code-barres invalide. Seuls les chiffres sont acceptés.'
    };
  }

  // Check barcode length (reasonable range for most barcode systems)
  if (cleaned.length < 6) {
    return {
      isValid: false,
      error: 'Code-barres trop court. Minimum 6 chiffres requis.'
    };
  }

  if (cleaned.length > 20) {
    return {
      isValid: false,
      error: 'Code-barres trop long. Maximum 20 chiffres autorisés.'
    };
  }

  return {
    isValid: true,
    cleanedBarcode: cleaned
  };
}

/**
 * Checks if a barcode looks like a sale/invoice barcode (YYYYMMDDXXXXXX format)
 */
export function isSaleBarcode(barcode: string): boolean {
  if (!barcode || typeof barcode !== 'string') {
    return false;
  }

  const cleaned = barcode.trim();
  
  // Sale barcodes are exactly 14 digits in YYYYMMDDXXXXXX format
  if (!/^\d{14}$/.test(cleaned)) {
    return false;
  }

  // Additional validation: check if the first 8 digits could be a valid date
  const dateStr = cleaned.substring(0, 8);
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6));
  const day = parseInt(dateStr.substring(6, 8));

  // Basic date validation
  if (year < 2020 || year > 2030) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

/**
 * Formats a barcode for display with appropriate spacing
 */
export function formatBarcodeForDisplay(barcode: string): string {
  if (!barcode || typeof barcode !== 'string') {
    return '';
  }

  const cleaned = barcode.trim();

  // If it's a sale barcode, format as YYYY-MM-DD-XXXXXX
  if (isSaleBarcode(cleaned)) {
    return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}-${cleaned.substring(8)}`;
  }

  // For other barcodes, add spaces every 4 digits for readability
  return cleaned.replace(/(\d{4})/g, '$1 ').trim();
}

/**
 * Generates a barcode for a sale based on sale ID and date
 */
export function generateSaleBarcode(saleId: number, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const paddedId = String(saleId).padStart(6, '0');

  return `${year}${month}${day}${paddedId}`;
}

/**
 * Extracts sale information from a sale barcode
 */
export function parseSaleBarcode(barcode: string): { date: Date; saleId: number } | null {
  if (!isSaleBarcode(barcode)) {
    return null;
  }

  const cleaned = barcode.trim();
  const year = parseInt(cleaned.substring(0, 4));
  const month = parseInt(cleaned.substring(4, 6)) - 1; // Month is 0-indexed in Date
  const day = parseInt(cleaned.substring(6, 8));
  const saleId = parseInt(cleaned.substring(8));

  try {
    const date = new Date(year, month, day);
    return { date, saleId };
  } catch (error) {
    return null;
  }
}

/**
 * Clean barcode input to handle scanner encoding issues (French keyboard mapping)
 */
export function cleanBarcodeInput(input: string): string {
  if (!input) return '';

  // First, try to extract only numeric characters
  let cleaned = input.replace(/[^0-9]/g, '');

  // If we have a good numeric result, return it
  if (cleaned.length >= 8) {
    return cleaned;
  }

  // French keyboard mapping for barcode scanners
  const frenchToNumeric: { [key: string]: string } = {
    'à': '0', '&': '1', 'é': '2', '"': '3', "'": '4',
    '(': '5', '-': '6', 'è': '7', '_': '8', 'ç': '9',
    'À': '0', '0': '0', '1': '1', '2': '2', '3': '3',
    '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
  };

  // Map French characters to numbers
  const frenchMapped = input.split('').map(char => frenchToNumeric[char] || '').join('');

  // Use the better result
  if (frenchMapped.length > cleaned.length) {
    cleaned = frenchMapped;
  }

  return cleaned.replace(/[^0-9]/g, '');
}
