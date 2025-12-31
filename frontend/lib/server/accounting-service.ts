/**
 * Accounting Service
 * Automatically creates income entries when orders are placed, delivered, cancelled, or refunded
 */

import prisma from '@/lib/prisma';
import { Order, IncomeCategory, IncomeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

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
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

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

  // Calculate VAT (20% standard rate, included in price)
  const totalPrice = new Decimal(order.totalPrice);
  const vatAmount = totalPrice.dividedBy(6).toDecimalPlaces(2); // VAT = Price / 6 for 20% inclusive
  const netAmount = totalPrice.minus(vatAmount);

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
      vatAmount,
      vatRate: new Decimal(20),
      isVatIncluded: true,
      externalReference: order.id,
      status: status as IncomeStatus,
      notes: `Auto-generated from order payment. Net: £${netAmount.toFixed(2)}, VAT: £${vatAmount.toFixed(2)}`,
    },
  });

  console.log(`Income entry ${incomeNumber} created for order ${order.id} (status: ${status})`);
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
  refundAmount: number | Decimal,
  reason: string
): Promise<void> {
  const incomeNumber = await generateIncomeNumber();
  const taxYear = getTaxYear(new Date());
  const amount = new Decimal(refundAmount);

  // Calculate VAT portion of refund
  const vatAmount = amount.dividedBy(6).toDecimalPlaces(2);

  // Create negative income entry (refund)
  await prisma.income.create({
    data: {
      incomeNumber,
      orderId: order.id,
      category: IncomeCategory.PRODUCT_SALES,
      description: `REFUND - Order #${order.id.slice(0, 8).toUpperCase()} - ${reason}`,
      amount: amount.negated(), // Negative amount for refund
      currency: 'GBP',
      source: 'MakeBelieve Imprints Website',
      customerName: order.customer.name || order.customer.email,
      incomeDate: new Date(),
      taxYear,
      vatAmount: vatAmount.negated(),
      vatRate: new Decimal(20),
      isVatIncluded: true,
      externalReference: order.id,
      status: 'CONFIRMED' as IncomeStatus, // Refunds are immediately confirmed
      notes: `Auto-generated refund entry. Reason: ${reason}`,
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
