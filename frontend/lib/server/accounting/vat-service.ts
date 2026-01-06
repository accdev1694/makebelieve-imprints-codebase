/**
 * VAT Service
 *
 * Handles VAT calculations and parsing for expense and income management.
 */

import { ExpenseCategory } from '@prisma/client';

// =============================================================================
// Category Mappings for CSV Import
// =============================================================================

export const CATEGORY_MAPPINGS: Record<string, ExpenseCategory> = {
  // Direct matches (from schema enum)
  MATERIALS: 'MATERIALS',
  PACKAGING: 'PACKAGING',
  SHIPPING_SUPPLIES: 'SHIPPING_SUPPLIES',
  EQUIPMENT: 'EQUIPMENT',
  SOFTWARE: 'SOFTWARE',
  UTILITIES: 'UTILITIES',
  MARKETING: 'MARKETING',
  OTHER: 'OTHER',
  // Common alternatives mapped to valid categories
  printing: 'MATERIALS',
  print: 'MATERIALS',
  materials: 'MATERIALS',
  ink: 'MATERIALS',
  paper: 'MATERIALS',
  supplies: 'MATERIALS',
  package: 'PACKAGING',
  boxes: 'PACKAGING',
  ship: 'SHIPPING_SUPPLIES',
  shipping: 'SHIPPING_SUPPLIES',
  postage: 'SHIPPING_SUPPLIES',
  delivery: 'SHIPPING_SUPPLIES',
  courier: 'SHIPPING_SUPPLIES',
  equip: 'EQUIPMENT',
  hardware: 'EQUIPMENT',
  machinery: 'EQUIPMENT',
  printer: 'EQUIPMENT',
  soft: 'SOFTWARE',
  subscription: 'SOFTWARE',
  saas: 'SOFTWARE',
  app: 'SOFTWARE',
  ads: 'MARKETING',
  advertising: 'MARKETING',
  promotion: 'MARKETING',
  electric: 'UTILITIES',
  gas: 'UTILITIES',
  water: 'UTILITIES',
  internet: 'UTILITIES',
  phone: 'UTILITIES',
  rent: 'UTILITIES',
  office: 'UTILITIES',
  misc: 'OTHER',
  miscellaneous: 'OTHER',
  bank: 'OTHER',
  fees: 'OTHER',
  insurance: 'OTHER',
  travel: 'OTHER',
  fuel: 'OTHER',
};

// =============================================================================
// VAT Parsing Functions
// =============================================================================

/**
 * Parse a category string to ExpenseCategory enum
 */
export function parseCategory(value: string | undefined): ExpenseCategory | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  // Try direct enum match first
  const upperValue = value.trim().toUpperCase().replace(/\s+/g, '_');
  if (Object.values(ExpenseCategory).includes(upperValue as ExpenseCategory)) {
    return upperValue as ExpenseCategory;
  }

  // Try mappings
  for (const [key, category] of Object.entries(CATEGORY_MAPPINGS)) {
    if (normalized.includes(key.toLowerCase())) {
      return category;
    }
  }

  return null;
}

/**
 * Parse a date string in various formats
 */
export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;

  const trimmed = value.trim();

  // Try various date formats
  // DD/MM/YYYY (UK format)
  const ukMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  // YYYY-MM-DD (ISO format)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date;
  }

  // MM/DD/YYYY (US format) - check if month makes sense
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  // Try native parsing as fallback
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

/**
 * Parse an amount string, handling currency symbols
 */
export function parseAmount(value: string | undefined): number | null {
  if (!value) return null;

  // Remove currency symbols and whitespace
  const cleaned = value.trim().replace(/[£$€,\s]/g, '');
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

/**
 * Parse a boolean string
 */
export function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ['true', 'yes', '1', 'y'].includes(normalized);
}
