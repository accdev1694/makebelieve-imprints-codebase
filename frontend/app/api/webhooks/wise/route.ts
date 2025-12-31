import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { ExpenseCategory } from '@prisma/client';

/**
 * Wise Webhook Handler
 *
 * For Business accounts, Wise can send real-time webhooks for:
 * - balance credits
 * - balance account credits
 * - transfers state changes
 * - card transactions
 *
 * Webhook signature verification uses the public key from Wise
 */

// Wise public key for webhook verification (production)
const WISE_PUBLIC_KEY = process.env.WISE_WEBHOOK_PUBLIC_KEY || '';

interface WiseWebhookPayload {
  data: {
    resource: {
      id: number;
      profile_id: number;
      type: string;
    };
    current_state?: string;
    previous_state?: string;
    occurred_at: string;
  };
  subscription_id: string;
  event_type: string;
  schema_version: string;
  sent_at: string;
}

interface WiseCardTransaction {
  id: string;
  cardId: string;
  cardToken: string;
  profileId: number;
  status: string;
  amount: {
    value: number;
    currency: string;
  };
  fees?: {
    value: number;
    currency: string;
  };
  merchant: {
    name: string;
    mcc: string;
    city: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Verify Wise webhook signature
 */
function verifySignature(payload: string, signature: string): boolean {
  if (!WISE_PUBLIC_KEY) {
    console.warn('WISE_WEBHOOK_PUBLIC_KEY not configured, skipping verification');
    return true; // Skip verification in development
  }

  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(payload);
    return verifier.verify(WISE_PUBLIC_KEY, signature, 'base64');
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Map merchant category code to expense category
 */
function mapMerchantToExpenseCategory(mcc: string): ExpenseCategory {
  const mccNum = parseInt(mcc);

  // Office supplies and equipment
  if ([5111, 5943, 5944, 5945, 5947].includes(mccNum)) return 'MATERIALS';

  // Electronics and software
  if ([5045, 5732].includes(mccNum)) return 'EQUIPMENT';
  if ([5734].includes(mccNum)) return 'SOFTWARE';

  // Shipping
  if ([4215, 4225, 4722].includes(mccNum)) return 'SHIPPING_SUPPLIES';

  // Marketing
  if ([7311, 7333, 7338].includes(mccNum)) return 'MARKETING';

  // Utilities
  if ([4900].includes(mccNum)) return 'UTILITIES';

  // General retail
  if ([5310, 5311, 5331, 5399, 5411].includes(mccNum)) return 'MATERIALS';

  return 'OTHER';
}

/**
 * Generate expense number
 */
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

/**
 * Get UK tax year
 */
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
 * Handle card transaction webhook
 */
async function handleCardTransaction(transaction: WiseCardTransaction) {
  const profileId = String(transaction.profileId);

  // Find the Wise account
  const account = await prisma.wiseAccount.findFirst({
    where: { profileId, isActive: true },
  });

  if (!account) {
    console.log(`No active account found for profile ${profileId}`);
    return;
  }

  // Check if transaction already exists
  const existing = await prisma.wiseTransaction.findUnique({
    where: { wiseTransactionId: transaction.id },
  });

  if (existing) {
    // Update status if changed
    if (existing.status !== transaction.status) {
      await prisma.wiseTransaction.update({
        where: { id: existing.id },
        data: {
          status: transaction.status === 'COMPLETED' ? 'COMPLETED' :
            transaction.status === 'CANCELLED' ? 'CANCELLED' :
              transaction.status === 'FAILED' ? 'FAILED' : 'PENDING',
        },
      });
    }
    return;
  }

  // Determine if this is an outgoing payment
  const isOutgoing = transaction.amount.value < 0;
  const absAmount = Math.abs(transaction.amount.value);

  // Create transaction record
  const wiseTx = await prisma.wiseTransaction.create({
    data: {
      accountId: account.id,
      wiseTransactionId: transaction.id,
      type: 'CARD_PAYMENT',
      status: transaction.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      direction: isOutgoing ? 'OUTGOING' : 'INCOMING',
      amount: absAmount,
      currency: transaction.amount.currency,
      amountInGBP: transaction.amount.currency === 'GBP' ? absAmount : undefined,
      fee: transaction.fees?.value,
      merchantName: transaction.merchant.name,
      merchantCategoryCode: transaction.merchant.mcc,
      cardLast4: transaction.cardToken.slice(-4),
      cardId: transaction.cardId,
      transactionDate: new Date(transaction.createdAt),
      rawData: transaction as unknown as Record<string, unknown>,
    },
  });

  // Auto-create expense for completed outgoing payments
  if (
    account.autoCreateExpense &&
    isOutgoing &&
    transaction.status === 'COMPLETED'
  ) {
    const expenseNumber = await generateExpenseNumber();
    const taxYear = getTaxYear(new Date(transaction.createdAt));
    const category = mapMerchantToExpenseCategory(transaction.merchant.mcc);

    // Calculate VAT (assume 20% standard rate for UK purchases)
    const vatAmount = transaction.amount.currency === 'GBP' ? absAmount / 6 : 0;

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        category,
        description: `Purchase from ${transaction.merchant.name}`,
        amount: absAmount,
        currency: transaction.amount.currency,
        purchaseDate: new Date(transaction.createdAt),
        importSource: 'WISE_API',
        externalReference: transaction.id,
        vatAmount: vatAmount > 0 ? vatAmount : undefined,
        vatRate: vatAmount > 0 ? 20 : undefined,
        isVatReclaimable: vatAmount > 0,
        taxYear,
        notes: `Auto-captured from Wise card ****${transaction.cardToken.slice(-4)}`,
        searchMetadata: {
          wiseTransactionId: transaction.id,
          merchantMcc: transaction.merchant.mcc,
          merchantCity: transaction.merchant.city,
          merchantCountry: transaction.merchant.country,
        },
      },
    });

    // Link transaction to expense
    await prisma.wiseTransaction.update({
      where: { id: wiseTx.id },
      data: { expenseId: expense.id },
    });

    console.log(
      `Expense ${expenseNumber} auto-created from Wise card payment: ${transaction.amount.currency} ${absAmount}`
    );
  }
}

/**
 * POST /api/webhooks/wise
 * Handle Wise webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-signature-sha256') || '';

  // Verify signature (skip in development if not configured)
  if (WISE_PUBLIC_KEY && !verifySignature(body, signature)) {
    console.error('Invalid Wise webhook signature');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  let payload: WiseWebhookPayload;

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  console.log(`Wise webhook received: ${payload.event_type}`);

  try {
    switch (payload.event_type) {
      case 'cards#card-transaction-state-change':
      case 'cards#card-transaction-created': {
        // Fetch full transaction details from Wise API
        // For now, use the basic data from the webhook
        const cardTx: WiseCardTransaction = {
          id: String(payload.data.resource.id),
          cardId: '',
          cardToken: '',
          profileId: payload.data.resource.profile_id,
          status: payload.data.current_state || 'PENDING',
          amount: { value: 0, currency: 'GBP' },
          merchant: { name: 'Unknown', mcc: '0000', city: '', country: '' },
          createdAt: payload.data.occurred_at,
          updatedAt: payload.sent_at,
        };

        await handleCardTransaction(cardTx);
        break;
      }

      case 'balances#credit': {
        // Money added to balance - could be refund or incoming transfer
        console.log(`Balance credit received for profile ${payload.data.resource.profile_id}`);
        break;
      }

      case 'transfers#state-change': {
        // Transfer state changed - could track outgoing payments
        console.log(`Transfer state changed: ${payload.data.previous_state} -> ${payload.data.current_state}`);
        break;
      }

      default:
        console.log(`Unhandled Wise event type: ${payload.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Wise webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/wise
 * Health check endpoint for Wise webhook configuration
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    configured: !!WISE_PUBLIC_KEY,
    message: 'Wise webhook endpoint is active',
  });
}
