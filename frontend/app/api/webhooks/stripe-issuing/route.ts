import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { ExpenseCategory, TransactionStatus } from '@prisma/client';

// Lazy initialization of Stripe
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(key);
  }
  return stripe;
}

function getIssuingWebhookSecret(): string {
  const secret = process.env.STRIPE_ISSUING_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_ISSUING_WEBHOOK_SECRET is not configured');
  }
  return secret;
}

// Map Stripe MCC codes to expense categories
function mapMerchantCategoryToExpense(mcc: string): ExpenseCategory {
  const mccMapping: Record<string, ExpenseCategory> = {
    // Office supplies and equipment
    '5111': 'MATERIALS', // Stationery
    '5943': 'MATERIALS', // Stationery stores
    '5944': 'MATERIALS', // Jewelry stores (for craft supplies)
    '5945': 'MATERIALS', // Hobby/toy/game shops
    '5947': 'MATERIALS', // Gift/novelty stores

    // Electronics and software
    '5045': 'EQUIPMENT', // Computers
    '5732': 'EQUIPMENT', // Electronics stores
    '5734': 'SOFTWARE', // Computer software stores

    // Shipping and logistics
    '4215': 'SHIPPING_SUPPLIES', // Courier services
    '4225': 'SHIPPING_SUPPLIES', // Public warehousing
    '4722': 'SHIPPING_SUPPLIES', // Travel agencies (shipping)

    // Marketing and advertising
    '7311': 'MARKETING', // Advertising services
    '7333': 'MARKETING', // Commercial photography
    '7338': 'MARKETING', // Quick copy/repro

    // General merchandise
    '5310': 'MATERIALS', // Discount stores
    '5311': 'MATERIALS', // Department stores
    '5331': 'MATERIALS', // Variety stores
    '5399': 'MATERIALS', // Misc general merchandise
    '5411': 'MATERIALS', // Grocery stores
    '5691': 'MATERIALS', // Men's/women's clothing
    '5999': 'OTHER', // Misc specialty retail
  };

  return mccMapping[mcc] || 'OTHER';
}

// Generate expense number
async function generateExpenseNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

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

// Get UK tax year
function getTaxYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (month < 4 || (month === 4 && day < 6)) {
    return `${year - 1}/${year}`;
  }
  return `${year}/${year + 1}`;
}

/**
 * POST /api/webhooks/stripe-issuing
 * Handle Stripe Issuing webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, getIssuingWebhookSecret());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Issuing webhook signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'issuing_authorization.created': {
        const authorization = event.data.object as Stripe.Issuing.Authorization;
        await handleAuthorizationCreated(authorization);
        break;
      }

      case 'issuing_authorization.updated': {
        const authorization = event.data.object as Stripe.Issuing.Authorization;
        await handleAuthorizationUpdated(authorization);
        break;
      }

      case 'issuing_transaction.created': {
        const transaction = event.data.object as Stripe.Issuing.Transaction;
        await handleTransactionCreated(transaction);
        break;
      }

      default:
        console.log(`Unhandled Issuing event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Issuing webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle new authorization (pending transaction)
 */
async function handleAuthorizationCreated(authorization: Stripe.Issuing.Authorization) {
  const cardId = authorization.card.id;

  // Find the card in our database
  const card = await prisma.virtualCard.findFirst({
    where: { stripeCardId: cardId },
  });

  if (!card) {
    console.error(`Card not found for authorization: ${authorization.id}`);
    return;
  }

  // Create pending transaction record
  await prisma.supplierTransaction.create({
    data: {
      cardId: card.id,
      stripeAuthId: authorization.id,
      merchantName: authorization.merchant_data.name || 'Unknown Merchant',
      merchantCategory: authorization.merchant_data.category,
      amount: authorization.amount / 100,
      currency: authorization.currency.toUpperCase(),
      status: 'PENDING',
    },
  });

  console.log(`Authorization created: ${authorization.id} for £${authorization.amount / 100}`);
}

/**
 * Handle authorization update (approved/declined)
 */
async function handleAuthorizationUpdated(authorization: Stripe.Issuing.Authorization) {
  const transaction = await prisma.supplierTransaction.findFirst({
    where: { stripeAuthId: authorization.id },
  });

  if (!transaction) {
    console.log(`Transaction not found for authorization update: ${authorization.id}`);
    return;
  }

  let newStatus: TransactionStatus = 'PENDING';

  if (authorization.status === 'closed') {
    if (authorization.approved) {
      newStatus = 'COMPLETED';
    } else {
      newStatus = 'DECLINED';
    }
  } else if (authorization.status === 'reversed') {
    newStatus = 'REFUNDED';
  }

  await prisma.supplierTransaction.update({
    where: { id: transaction.id },
    data: {
      status: newStatus,
      amount: authorization.amount / 100, // Update in case amount changed
    },
  });

  console.log(`Authorization updated: ${authorization.id} status: ${newStatus}`);
}

/**
 * Handle completed transaction - auto-create expense
 */
async function handleTransactionCreated(transaction: Stripe.Issuing.Transaction) {
  // Get authorization ID (can be string or object)
  const authorizationId = typeof transaction.authorization === 'string'
    ? transaction.authorization
    : transaction.authorization?.id;

  // Find the supplier transaction
  const supplierTx = await prisma.supplierTransaction.findFirst({
    where: { stripeAuthId: authorizationId || '' },
  });

  if (!supplierTx) {
    console.log(`Supplier transaction not found for: ${transaction.id}`);
    return;
  }

  // Skip if expense already created
  if (supplierTx.expenseId) {
    console.log(`Expense already exists for transaction: ${transaction.id}`);
    return;
  }

  const expenseNumber = await generateExpenseNumber();
  const taxYear = getTaxYear(new Date());
  const amount = Math.abs(transaction.amount) / 100;

  // Calculate VAT (assuming 20% standard rate included)
  const vatAmount = amount / 6; // VAT = Price / 6 for 20% inclusive

  // Determine category from merchant category code
  const category = mapMerchantCategoryToExpense(
    transaction.merchant_data.category || ''
  );

  // Create expense entry
  const expense = await prisma.expense.create({
    data: {
      expenseNumber,
      category,
      description: `Purchase from ${transaction.merchant_data.name || 'Unknown'}`,
      amount,
      currency: transaction.currency.toUpperCase(),
      purchaseDate: new Date(transaction.created * 1000),
      importSource: 'SUPPLIER_INTEGRATION',
      externalReference: transaction.id,
      vatAmount,
      vatRate: 20,
      isVatReclaimable: true,
      taxYear,
      notes: `Auto-captured from Stripe Issuing card ****${supplierTx.cardId.slice(-4)}`,
      searchMetadata: {
        stripeTransactionId: transaction.id,
        merchantCategory: transaction.merchant_data.category,
        merchantCategoryCode: transaction.merchant_data.category_code,
        cardId: supplierTx.cardId,
      },
    },
  });

  // Link transaction to expense
  await prisma.supplierTransaction.update({
    where: { id: supplierTx.id },
    data: {
      expenseId: expense.id,
      status: 'COMPLETED',
    },
  });

  console.log(
    `Expense ${expenseNumber} auto-created for transaction ${transaction.id}: £${amount}`
  );
}
