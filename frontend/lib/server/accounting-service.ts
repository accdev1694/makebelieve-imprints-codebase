/**
 * Accounting Service
 * Automatically creates income entries when orders are placed, delivered, cancelled, or refunded
 */

import prisma from '@/lib/prisma';
import { Order, IncomeCategory, IncomeStatus, InvoiceStatus } from '@prisma/client';
import { calculateVATFromGross, UK_VAT_RATES } from './tax-utils';

// UK tax year runs April 6 to April 5
function getTaxYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed
  const day = date.getDate();

  // If before April 6, we're in previous tax year
  if (month < 4 || (month === 4 && day < 6)) {
    return `${year - 1}/${year}`;
  }
  return `${year}/${year + 1}`;
}

// Generate income number: INC-YYYYMMDD-XXXX
async function generateIncomeNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Count today's incomes to generate sequence
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await prisma.income.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `INC-${dateStr}-${sequence}`;
}

// Generate invoice number: INV-YYYYMMDD-XXXX
async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Count today's invoices to generate sequence
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await prisma.invoice.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `INV-${dateStr}-${sequence}`;
}

interface OrderWithCustomer extends Order {
  customer: {
    name: string | null;
    email: string;
  };
}

/**
 * Create income entry from order payment
 * Called when checkout.session.completed webhook fires
 */
export async function createIncomeFromOrder(
  order: OrderWithCustomer,
  status: 'PENDING' | 'CONFIRMED' = 'PENDING'
): Promise<void> {
  // Check if income already exists for this order
  const existingIncome = await prisma.income.findFirst({
    where: { orderId: order.id },
  });

  if (existingIncome) {
    console.log(`Income entry already exists for order ${order.id}`);
    return;
  }

  const incomeNumber = await generateIncomeNumber();
  const taxYear = getTaxYear(new Date());

  // Calculate VAT using centralized tax utility (20% standard UK rate, included in price)
  const totalPrice = Number(order.totalPrice);
  const { netAmount, vatAmount } = calculateVATFromGross(totalPrice, UK_VAT_RATES.STANDARD);

  await prisma.income.create({
    data: {
      incomeNumber,
      orderId: order.id,
      category: IncomeCategory.PRODUCT_SALES,
      description: `Order #${order.id.slice(0, 8).toUpperCase()} - Online Sale`,
      amount: totalPrice,
      currency: 'GBP',
      source: 'MakeBelieve Imprints Website',
      customerName: order.customer.name || order.customer.email,
      incomeDate: new Date(),
      taxYear,
      vatAmount: vatAmount,
      vatRate: UK_VAT_RATES.STANDARD,
      isVatIncluded: true,
      externalReference: order.id,
      status: status as IncomeStatus,
      notes: `Auto-generated from order payment. Net: £${netAmount.toFixed(2)}, VAT: £${vatAmount.toFixed(2)}`,
    },
  });

  console.log(`Income entry ${incomeNumber} created for order ${order.id} (status: ${status})`);
}

/**
 * Create invoice from order payment
 * Called when checkout.session.completed webhook fires
 * Returns the invoice ID for PDF generation
 */
export async function createInvoiceFromOrder(
  order: OrderWithCustomer
): Promise<string | null> {
  // Check if invoice already exists for this order
  const existingInvoice = await prisma.invoice.findFirst({
    where: { orderId: order.id },
  });

  if (existingInvoice) {
    console.log(`Invoice already exists for order ${order.id}`);
    return existingInvoice.id;
  }

  const invoiceNumber = await generateInvoiceNumber();

  // Calculate amounts using centralized VAT function (20% UK standard rate, included in price)
  const totalPrice = Number(order.totalPrice);
  const { netAmount, vatAmount } = calculateVATFromGross(totalPrice, UK_VAT_RATES.STANDARD);

  const now = new Date();

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      orderId: order.id,
      subtotal: netAmount,
      vatRate: UK_VAT_RATES.STANDARD,
      vatAmount: vatAmount,
      total: totalPrice,
      currency: 'GBP',
      issueDate: now,
      dueDate: now, // Already paid, so due date is same as issue date
      status: InvoiceStatus.PAID,
      notes: `Auto-generated invoice for order #${order.id.slice(0, 8).toUpperCase()}`,
    },
  });

  console.log(`Invoice ${invoiceNumber} created for order ${order.id}`);
  return invoice.id;
}

/**
 * Update income status when order is delivered
 * Called when admin marks order as 'delivered'
 */
export async function updateIncomeStatus(
  orderId: string,
  newStatus: 'PENDING' | 'CONFIRMED' | 'REVERSED'
): Promise<void> {
  const income = await prisma.income.findFirst({
    where: { orderId },
  });

  if (!income) {
    console.warn(`No income entry found for order ${orderId}`);
    return;
  }

  await prisma.income.update({
    where: { id: income.id },
    data: {
      status: newStatus as IncomeStatus,
      updatedAt: new Date(),
    },
  });

  console.log(`Income ${income.incomeNumber} status updated to ${newStatus}`);
}

/**
 * Create refund/reversal entry
 * Called when order is refunded or cancelled with refund
 */
export async function createRefundEntry(
  order: OrderWithCustomer,
  refundAmount: number,
  reason: string
): Promise<void> {
  const incomeNumber = await generateIncomeNumber();
  const taxYear = getTaxYear(new Date());
  const amount = Number(refundAmount);

  // Calculate VAT portion of refund using centralized tax utility
  const { netAmount, vatAmount } = calculateVATFromGross(amount, UK_VAT_RATES.STANDARD);

  // Create negative income entry (refund)
  await prisma.income.create({
    data: {
      incomeNumber,
      orderId: order.id,
      category: IncomeCategory.PRODUCT_SALES,
      description: `REFUND - Order #${order.id.slice(0, 8).toUpperCase()} - ${reason}`,
      amount: -amount, // Negative amount for refund
      currency: 'GBP',
      source: 'MakeBelieve Imprints Website',
      customerName: order.customer.name || order.customer.email,
      incomeDate: new Date(),
      taxYear,
      vatAmount: -vatAmount,
      vatRate: UK_VAT_RATES.STANDARD,
      isVatIncluded: true,
      externalReference: order.id,
      status: 'CONFIRMED' as IncomeStatus, // Refunds are immediately confirmed
      notes: `Auto-generated refund entry. Net: £${netAmount.toFixed(2)}, VAT: £${vatAmount.toFixed(2)}. Reason: ${reason}`,
    },
  });

  // Also mark original income as reversed if it exists
  const originalIncome = await prisma.income.findFirst({
    where: {
      orderId: order.id,
      amount: { gt: 0 }, // Find positive (original) entry
    },
  });

  if (originalIncome) {
    await prisma.income.update({
      where: { id: originalIncome.id },
      data: { status: 'REVERSED' as IncomeStatus },
    });
  }

  console.log(`Refund entry ${incomeNumber} created for order ${order.id} (£${amount.toFixed(2)})`);
}

/**
 * Get order with customer info for accounting
 */
export async function getOrderForAccounting(orderId: string): Promise<OrderWithCustomer | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

// Generate expense number: EXP-YYYYMMDD-XXXX
async function generateExpenseNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await prisma.expense.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `EXP-${dateStr}-${sequence}`;
}

/**
 * Create expense entry for reprint orders
 * This tracks the cost of materials used for free reprints
 *
 * @param originalOrderId - The original order that had an issue
 * @param reprintOrderId - The new reprint order created
 * @param reason - The reason for the reprint (e.g., DAMAGED_IN_TRANSIT, QUALITY_ISSUE)
 * @param estimatedCost - Optional estimated material cost (defaults to calculated estimate)
 */
export async function createReprintExpense(
  originalOrderId: string,
  reprintOrderId: string,
  reason: string,
  estimatedCost?: number
): Promise<void> {
  try {
    // Get original order to estimate material cost
    const originalOrder = await prisma.order.findUnique({
      where: { id: originalOrderId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!originalOrder) {
      console.warn(`[Accounting] Cannot create reprint expense - original order ${originalOrderId} not found`);
      return;
    }

    // Estimate material cost as ~30% of original order value (typical margin)
    // This is a rough estimate - can be refined based on actual costs
    const originalTotal = Number(originalOrder.totalPrice);
    const materialCostEstimate = estimatedCost ?? Math.max(originalTotal * 0.3, 2.00); // Minimum £2

    const expenseNumber = await generateExpenseNumber();
    const taxYear = getTaxYear(new Date());

    // Calculate VAT using centralized tax utility (we can reclaim VAT on materials)
    const { vatAmount } = calculateVATFromGross(materialCostEstimate, UK_VAT_RATES.STANDARD);

    // Build description with item details
    const itemDescriptions = originalOrder.items
      .map(item => `${item.quantity}x ${item.product?.name || 'Unknown'}${item.variant?.name ? ` (${item.variant.name})` : ''}`)
      .join(', ');

    await prisma.expense.create({
      data: {
        expenseNumber,
        category: 'MATERIALS',
        description: `Reprint materials - ${reason} - Order #${originalOrderId.slice(0, 8).toUpperCase()}: ${itemDescriptions}`,
        amount: materialCostEstimate,
        currency: 'GBP',
        purchaseDate: new Date(),
        taxYear,
        vatAmount: vatAmount,
        vatRate: UK_VAT_RATES.STANDARD,
        isVatReclaimable: true,
        importSource: 'MANUAL',
        notes: `Auto-generated expense for reprint order ${reprintOrderId.slice(0, 8).toUpperCase()}. Original order: ${originalOrderId.slice(0, 8).toUpperCase()}. Reason: ${reason}. This is an estimated material cost.`,
      },
    });

    console.log(`[Accounting] Reprint expense ${expenseNumber} created for order ${originalOrderId} -> ${reprintOrderId} (£${materialCostEstimate.toFixed(2)})`);
  } catch (error) {
    // Log but don't throw - expense tracking shouldn't block reprint creation
    console.error('[Accounting] Failed to create reprint expense:', error);
  }
}
