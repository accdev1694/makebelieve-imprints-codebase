/**
 * UK Tax Year Utilities
 *
 * UK Tax Year runs from April 6 to April 5 of the following year.
 * VAT quarters are: Q1 (Apr-Jun), Q2 (Jul-Sep), Q3 (Oct-Dec), Q4 (Jan-Mar)
 */

/**
 * Get the current UK tax year string (e.g., "2024-2025")
 */
export function getCurrentTaxYear(): string {
  return getTaxYearForDate(new Date());
}

/**
 * Get the tax year string for a given date
 * UK Tax Year: April 6 to April 5
 */
export function getTaxYearForDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();

  // If before April 6, we're in the previous tax year
  if (month < 3 || (month === 3 && day < 6)) {
    return `${year - 1}-${year}`;
  }

  return `${year}-${year + 1}`;
}

/**
 * Get the start and end dates for a given tax year string
 */
export function getTaxYearDates(taxYear: string): { start: Date; end: Date } {
  const [startYear, endYear] = taxYear.split('-').map(Number);

  if (!startYear || !endYear || endYear !== startYear + 1) {
    throw new Error(`Invalid tax year format: ${taxYear}. Expected format: "YYYY-YYYY" (e.g., "2024-2025")`);
  }

  return {
    start: new Date(startYear, 3, 6, 0, 0, 0, 0), // April 6
    end: new Date(endYear, 3, 5, 23, 59, 59, 999), // April 5
  };
}

/**
 * Get all available tax years from a start year to current
 */
export function getAvailableTaxYears(startYear: number = 2020): string[] {
  const currentTaxYear = getCurrentTaxYear();
  const [currentStartYear] = currentTaxYear.split('-').map(Number);
  const years: string[] = [];

  for (let year = startYear; year <= currentStartYear; year++) {
    years.push(`${year}-${year + 1}`);
  }

  return years.reverse(); // Most recent first
}

/**
 * Get VAT quarter information for a given date
 * UK VAT Quarters:
 * Q1: April 1 - June 30
 * Q2: July 1 - September 30
 * Q3: October 1 - December 31
 * Q4: January 1 - March 31
 */
export function getVATQuarter(date: Date): {
  quarter: number;
  start: Date;
  end: Date;
  label: string;
} {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();

  let quarter: number;
  let start: Date;
  let end: Date;

  if (month >= 0 && month <= 2) {
    // January - March (Q4)
    quarter = 4;
    start = new Date(year, 0, 1);
    end = new Date(year, 2, 31, 23, 59, 59, 999);
  } else if (month >= 3 && month <= 5) {
    // April - June (Q1)
    quarter = 1;
    start = new Date(year, 3, 1);
    end = new Date(year, 5, 30, 23, 59, 59, 999);
  } else if (month >= 6 && month <= 8) {
    // July - September (Q2)
    quarter = 2;
    start = new Date(year, 6, 1);
    end = new Date(year, 8, 30, 23, 59, 59, 999);
  } else {
    // October - December (Q3)
    quarter = 3;
    start = new Date(year, 9, 1);
    end = new Date(year, 11, 31, 23, 59, 59, 999);
  }

  const quarterLabels: Record<number, string> = {
    1: 'Apr - Jun',
    2: 'Jul - Sep',
    3: 'Oct - Dec',
    4: 'Jan - Mar',
  };

  return {
    quarter,
    start,
    end,
    label: `Q${quarter} ${year} (${quarterLabels[quarter]})`,
  };
}

/**
 * Get all VAT quarters for a tax year
 */
export function getVATQuartersForTaxYear(taxYear: string): Array<{
  quarter: number;
  start: Date;
  end: Date;
  label: string;
}> {
  const { start: taxYearStart } = getTaxYearDates(taxYear);
  const startYear = taxYearStart.getFullYear();

  return [
    // Q1: Apr - Jun of start year
    {
      quarter: 1,
      start: new Date(startYear, 3, 1),
      end: new Date(startYear, 5, 30, 23, 59, 59, 999),
      label: `Q1 ${startYear} (Apr - Jun)`,
    },
    // Q2: Jul - Sep of start year
    {
      quarter: 2,
      start: new Date(startYear, 6, 1),
      end: new Date(startYear, 8, 30, 23, 59, 59, 999),
      label: `Q2 ${startYear} (Jul - Sep)`,
    },
    // Q3: Oct - Dec of start year
    {
      quarter: 3,
      start: new Date(startYear, 9, 1),
      end: new Date(startYear, 11, 31, 23, 59, 59, 999),
      label: `Q3 ${startYear} (Oct - Dec)`,
    },
    // Q4: Jan - Mar of end year
    {
      quarter: 4,
      start: new Date(startYear + 1, 0, 1),
      end: new Date(startYear + 1, 2, 31, 23, 59, 59, 999),
      label: `Q4 ${startYear + 1} (Jan - Mar)`,
    },
  ];
}

/**
 * Calculate VAT amount from gross amount
 * Standard UK VAT rate is 20%
 */
export function calculateVATFromGross(
  grossAmount: number,
  vatRate: number = 20
): { netAmount: number; vatAmount: number } {
  const vatMultiplier = vatRate / 100;
  const netAmount = grossAmount / (1 + vatMultiplier);
  const vatAmount = grossAmount - netAmount;

  return {
    netAmount: Math.round(netAmount * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
  };
}

/**
 * Calculate VAT amount from net amount
 */
export function calculateVATFromNet(
  netAmount: number,
  vatRate: number = 20
): { grossAmount: number; vatAmount: number } {
  const vatAmount = netAmount * (vatRate / 100);
  const grossAmount = netAmount + vatAmount;

  return {
    grossAmount: Math.round(grossAmount * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
  };
}

/**
 * Format currency in GBP
 */
export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

/**
 * Get week range (Monday to Sunday) for a given date
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday

  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get previous week range (Monday to Sunday)
 */
export function getPreviousWeekRange(): { start: Date; end: Date } {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  return getWeekRange(lastWeek);
}

/**
 * UK VAT rates
 */
export const UK_VAT_RATES = {
  STANDARD: 20,
  REDUCED: 5,
  ZERO: 0,
} as const;

/**
 * Expense categories with display labels
 */
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  MATERIALS: 'Materials & Supplies',
  PACKAGING: 'Packaging',
  SHIPPING_SUPPLIES: 'Shipping Supplies',
  EQUIPMENT: 'Equipment',
  SOFTWARE: 'Software & Subscriptions',
  UTILITIES: 'Utilities',
  MARKETING: 'Marketing & Advertising',
  OTHER: 'Other Expenses',
};

/**
 * Income categories with display labels
 */
export const INCOME_CATEGORY_LABELS: Record<string, string> = {
  PRODUCT_SALES: 'Product Sales',
  WHOLESALE: 'Wholesale',
  MARKET_SALES: 'Market/Event Sales',
  ONLINE_MARKETPLACE: 'Online Marketplace (Etsy, eBay, etc.)',
  CUSTOM_ORDERS: 'Custom Orders',
  SHIPPING_REIMBURSEMENT: 'Shipping Reimbursement',
  REFUND_RECEIVED: 'Refund Received',
  OTHER: 'Other Income',
};
