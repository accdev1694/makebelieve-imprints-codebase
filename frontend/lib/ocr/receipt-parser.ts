import { OCRResult } from './tesseract-service';

export interface ParsedReceipt {
  vendor?: string;
  date?: Date;
  total?: number;
  subtotal?: number;
  vatAmount?: number;
  vatRate?: number;
  items?: Array<{ description: string; amount: number }>;
  paymentMethod?: string;
  rawText: string;
  confidence: number;
}

// UK date patterns (DD/MM/YYYY, DD-MM-YYYY, DD MM YYYY, DD Mon YYYY)
const UK_DATE_PATTERNS = [
  /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/g, // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})(?!\d)/g, // DD/MM/YY
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi,
  /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi,
];

// Total amount patterns (UK format with £)
const TOTAL_PATTERNS = [
  /(?:total|amount\s*due|to\s*pay|grand\s*total|balance\s*due|total\s*gbp)[:\s]*£?\s*(\d+[.,]\d{2})/gi,
  /(?:total|amount)[:\s]*(\d+[.,]\d{2})\s*(?:gbp|pounds?)?/gi,
  /£\s*(\d+[.,]\d{2})\s*(?:total|due)/gi,
  /(?:card|cash|paid)[:\s]*£?\s*(\d+[.,]\d{2})/gi,
];

// Subtotal patterns
const SUBTOTAL_PATTERNS = [
  /(?:sub\s*total|subtotal|net)[:\s]*£?\s*(\d+[.,]\d{2})/gi,
  /(?:excl(?:uding)?\.?\s*vat)[:\s]*£?\s*(\d+[.,]\d{2})/gi,
];

// VAT amount patterns
const VAT_AMOUNT_PATTERNS = [
  /(?:vat|tax|v\.?a\.?t\.?)[:\s]*£?\s*(\d+[.,]\d{2})/gi,
  /(?:vat\s*@\s*\d+%?)[:\s]*£?\s*(\d+[.,]\d{2})/gi,
  /(\d+[.,]\d{2})\s*(?:vat|tax)/gi,
];

// VAT rate patterns
const VAT_RATE_PATTERNS = [
  /(?:vat|tax)\s*(?:@|at)?\s*(\d+(?:\.\d+)?)\s*%/gi,
  /(\d+(?:\.\d+)?)\s*%\s*(?:vat|tax)/gi,
  /(?:includes?\s+)?(?:vat|tax)\s+(?:at\s+)?(\d+(?:\.\d+)?)\s*%/gi,
];

// Payment method patterns
const PAYMENT_PATTERNS = [
  /(?:paid\s*by|payment\s*method|payment)[:\s]*(card|cash|visa|mastercard|amex|american\s*express|debit|credit|contactless|apple\s*pay|google\s*pay)/gi,
  /(visa|mastercard|amex|american\s*express|debit|credit)/gi,
];

// Common UK store names to help identify vendor
const KNOWN_VENDORS = [
  'tesco', 'sainsbury', 'asda', 'morrisons', 'waitrose', 'lidl', 'aldi',
  'boots', 'superdrug', 'wilko', 'poundland', 'b&q', 'homebase', 'screwfix',
  'argos', 'john lewis', 'marks & spencer', 'm&s', 'next', 'primark',
  'wh smith', 'costa', 'starbucks', 'mcdonald', 'greggs', 'subway',
  'amazon', 'ebay', 'viking', 'staples', 'ryman', 'officeworks',
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Parse OCR result to extract receipt data
 * Optimized for UK receipts with GBP currency and UK date formats
 */
export function parseReceipt(ocrResult: OCRResult): ParsedReceipt {
  const text = ocrResult.text;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const result: ParsedReceipt = {
    rawText: text,
    confidence: ocrResult.confidence,
  };

  // Extract vendor (usually first few lines)
  result.vendor = extractVendor(lines);

  // Extract date
  result.date = extractDate(text);

  // Extract total
  result.total = extractTotal(text);

  // Extract subtotal
  result.subtotal = extractSubtotal(text);

  // Extract VAT
  const vatInfo = extractVAT(text);
  result.vatAmount = vatInfo.amount;
  result.vatRate = vatInfo.rate;

  // Calculate VAT if we have total and subtotal but not VAT amount
  if (!result.vatAmount && result.total && result.subtotal) {
    result.vatAmount = Math.round((result.total - result.subtotal) * 100) / 100;
  }

  // If we have total and VAT but not subtotal, calculate it
  if (!result.subtotal && result.total && result.vatAmount) {
    result.subtotal = Math.round((result.total - result.vatAmount) * 100) / 100;
  }

  // Extract payment method
  result.paymentMethod = extractPaymentMethod(text);

  // Extract line items
  result.items = extractLineItems(lines);

  return result;
}

function extractVendor(lines: string[]): string | undefined {
  // Check first 5 lines for known vendors
  const topLines = lines.slice(0, 5).join(' ').toLowerCase();

  for (const vendor of KNOWN_VENDORS) {
    if (topLines.includes(vendor)) {
      // Return properly capitalized version
      return vendor.charAt(0).toUpperCase() + vendor.slice(1);
    }
  }

  // Otherwise, return first non-empty line that looks like a store name
  // (not a date, not just numbers, reasonably short)
  for (const line of lines.slice(0, 3)) {
    const cleaned = line.trim();
    if (
      cleaned.length > 2 &&
      cleaned.length < 50 &&
      !/^\d+[/-]/.test(cleaned) && // Not a date
      !/^[\d\s.,£]+$/.test(cleaned) && // Not just numbers/money
      !/^(vat|tax|total|subtotal)/i.test(cleaned) // Not a total line
    ) {
      return cleaned;
    }
  }

  return undefined;
}

function extractDate(text: string): Date | undefined {
  for (const pattern of UK_DATE_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern));
    for (const match of matches) {
      try {
        let day: number, month: number, year: number;

        if (match[2] && isNaN(parseInt(match[2]))) {
          // Month name format (e.g., "15 Jan 2024")
          day = parseInt(match[1]);
          month = MONTH_MAP[match[2].toLowerCase().slice(0, 3)] ?? 0;
          year = parseInt(match[3]);
        } else {
          // Numeric format (e.g., "15/01/2024")
          day = parseInt(match[1]);
          month = parseInt(match[2]) - 1; // JS months are 0-indexed
          year = parseInt(match[3]);

          // Handle 2-digit years
          if (year < 100) {
            year += year > 50 ? 1900 : 2000;
          }
        }

        // Validate date
        if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000 && year <= 2100) {
          const date = new Date(year, month, day);
          // Check if date is valid (handles month overflow)
          if (date.getDate() === day) {
            return date;
          }
        }
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

function extractTotal(text: string): number | undefined {
  const allMatches: Array<{ value: number; index: number }> = [];

  for (const pattern of TOTAL_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern));
    for (const match of matches) {
      const value = parseAmount(match[1]);
      if (value !== undefined && value > 0) {
        allMatches.push({ value, index: match.index ?? 0 });
      }
    }
  }

  // Return the largest amount found (usually the total is the largest)
  // or the last occurrence if amounts are similar
  if (allMatches.length > 0) {
    allMatches.sort((a, b) => b.value - a.value);
    return allMatches[0].value;
  }

  return undefined;
}

function extractSubtotal(text: string): number | undefined {
  for (const pattern of SUBTOTAL_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern));
    for (const match of matches) {
      const value = parseAmount(match[1]);
      if (value !== undefined && value > 0) {
        return value;
      }
    }
  }
  return undefined;
}

function extractVAT(text: string): { amount?: number; rate?: number } {
  let amount: number | undefined;
  let rate: number | undefined;

  // Extract VAT amount
  for (const pattern of VAT_AMOUNT_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern));
    for (const match of matches) {
      const value = parseAmount(match[1]);
      if (value !== undefined && value > 0) {
        amount = value;
        break;
      }
    }
    if (amount) break;
  }

  // Extract VAT rate
  for (const pattern of VAT_RATE_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern));
    for (const match of matches) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0 && value <= 100) {
        rate = value;
        break;
      }
    }
    if (rate) break;
  }

  // Default to UK standard VAT rate if we found VAT amount but no rate
  if (amount && !rate) {
    rate = 20;
  }

  return { amount, rate };
}

function extractPaymentMethod(text: string): string | undefined {
  for (const pattern of PAYMENT_PATTERNS) {
    const match = text.match(new RegExp(pattern));
    if (match && match[1]) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }
  return undefined;
}

function extractLineItems(lines: string[]): Array<{ description: string; amount: number }> {
  const items: Array<{ description: string; amount: number }> = [];

  // Pattern for line items: description followed by amount
  const lineItemPattern = /^(.+?)\s+£?\s*(\d+[.,]\d{2})\s*$/;

  for (const line of lines) {
    // Skip header/footer lines
    if (/^(total|subtotal|vat|tax|change|cash|card|paid|thank|receipt|date|time)/i.test(line)) {
      continue;
    }

    const match = line.match(lineItemPattern);
    if (match) {
      const description = match[1].trim();
      const amount = parseAmount(match[2]);

      if (description.length > 1 && amount !== undefined && amount > 0) {
        items.push({ description, amount });
      }
    }
  }

  return items;
}

function parseAmount(str: string): number | undefined {
  if (!str) return undefined;

  // Replace comma with dot for decimal
  const normalized = str.replace(',', '.');
  const value = parseFloat(normalized);

  return isNaN(value) ? undefined : Math.round(value * 100) / 100;
}

/**
 * Parse raw receipt text directly (without OCR)
 * Useful when user pastes text from a digital receipt
 */
export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const result: ParsedReceipt = {
    rawText: text,
    confidence: 100, // User-provided text, so 100% confidence in the input
  };

  // Extract vendor (usually first few lines)
  result.vendor = extractVendor(lines);

  // Extract date
  result.date = extractDate(text);

  // Extract total
  result.total = extractTotal(text);

  // Extract subtotal
  result.subtotal = extractSubtotal(text);

  // Extract VAT
  const vatInfo = extractVAT(text);
  result.vatAmount = vatInfo.amount;
  result.vatRate = vatInfo.rate;

  // Calculate VAT if we have total and subtotal but not VAT amount
  if (!result.vatAmount && result.total && result.subtotal) {
    result.vatAmount = Math.round((result.total - result.subtotal) * 100) / 100;
  }

  // If we have total and VAT but not subtotal, calculate it
  if (!result.subtotal && result.total && result.vatAmount) {
    result.subtotal = Math.round((result.total - result.vatAmount) * 100) / 100;
  }

  // Extract payment method
  result.paymentMethod = extractPaymentMethod(text);

  // Extract line items
  result.items = extractLineItems(lines);

  return result;
}

/**
 * Format parsed receipt data for display
 */
export function formatParsedReceipt(receipt: ParsedReceipt): string {
  const lines: string[] = [];

  if (receipt.vendor) {
    lines.push(`Vendor: ${receipt.vendor}`);
  }
  if (receipt.date) {
    lines.push(`Date: ${receipt.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`);
  }
  if (receipt.subtotal !== undefined) {
    lines.push(`Subtotal: £${receipt.subtotal.toFixed(2)}`);
  }
  if (receipt.vatAmount !== undefined) {
    lines.push(`VAT: £${receipt.vatAmount.toFixed(2)}${receipt.vatRate ? ` (${receipt.vatRate}%)` : ''}`);
  }
  if (receipt.total !== undefined) {
    lines.push(`Total: £${receipt.total.toFixed(2)}`);
  }
  if (receipt.paymentMethod) {
    lines.push(`Payment: ${receipt.paymentMethod}`);
  }
  lines.push(`Confidence: ${Math.round(receipt.confidence)}%`);

  return lines.join('\n');
}
