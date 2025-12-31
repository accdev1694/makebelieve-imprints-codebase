/**
 * Stripe Issuing Service
 * Manages virtual cards for supplier purchasing
 *
 * Note: Stripe Issuing requires business verification and approval.
 * This service will gracefully handle cases where Issuing is not enabled.
 */

import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { CardStatus } from '@prisma/client';

// Lazy initialize Stripe
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

/**
 * Check if Stripe Issuing is enabled for this account
 */
export async function isIssuingEnabled(): Promise<boolean> {
  if (process.env.STRIPE_ISSUING_ENABLED !== 'true') {
    return false;
  }

  try {
    // Try to list cardholders - this will fail if Issuing isn't enabled
    await getStripe().issuing.cardholders.list({ limit: 1 });
    return true;
  } catch (error) {
    console.log('Stripe Issuing not enabled:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Create a cardholder for an admin user
 */
export async function createCardholder(
  adminUser: { id: string; email: string; name?: string | null }
): Promise<{ success: boolean; cardholderId?: string; error?: string }> {
  try {
    const cardholder = await getStripe().issuing.cardholders.create({
      type: 'individual',
      name: adminUser.name || adminUser.email,
      email: adminUser.email,
      billing: {
        address: {
          line1: 'MakeBelieve Imprints',
          city: 'London',
          postal_code: 'SW1A 1AA',
          country: 'GB',
        },
      },
      metadata: {
        userId: adminUser.id,
      },
    });

    return { success: true, cardholderId: cardholder.id };
  } catch (error) {
    console.error('Create cardholder error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create cardholder',
    };
  }
}

/**
 * Create a virtual card
 */
export async function createVirtualCard(
  cardholderId: string,
  adminUserId: string,
  name: string,
  spendingLimit: number
): Promise<{ success: boolean; card?: { id: string; last4: string }; error?: string }> {
  try {
    // Create the card in Stripe
    const card = await getStripe().issuing.cards.create({
      cardholder: cardholderId,
      type: 'virtual',
      currency: 'gbp',
      status: 'active',
      spending_controls: {
        spending_limits: [
          {
            amount: Math.round(spendingLimit * 100), // Convert to pence
            interval: 'per_authorization',
          },
        ],
      },
      metadata: {
        name,
        createdBy: adminUserId,
      },
    });

    // Store in our database
    await prisma.virtualCard.create({
      data: {
        stripeCardId: card.id,
        cardholderId: cardholderId,
        name,
        last4: card.last4,
        expiryMonth: card.exp_month,
        expiryYear: card.exp_year,
        spendingLimit,
        status: 'ACTIVE',
        createdBy: adminUserId,
      },
    });

    return {
      success: true,
      card: { id: card.id, last4: card.last4 },
    };
  } catch (error) {
    console.error('Create virtual card error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create virtual card',
    };
  }
}

/**
 * List all virtual cards
 */
export async function listVirtualCards(adminUserId?: string): Promise<{
  success: boolean;
  cards: {
    id: string;
    stripeCardId: string;
    name: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    spendingLimit: number;
    status: CardStatus;
    createdAt: Date;
    transactionCount: number;
    totalSpent: number;
  }[];
}> {
  try {
    const where = adminUserId ? { createdBy: adminUserId } : {};

    const cards = await prisma.virtualCard.findMany({
      where,
      include: {
        transactions: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      cards: cards.map(card => ({
        id: card.id,
        stripeCardId: card.stripeCardId,
        name: card.name,
        last4: card.last4,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        spendingLimit: Number(card.spendingLimit),
        status: card.status,
        createdAt: card.createdAt,
        transactionCount: card.transactions.length,
        totalSpent: card.transactions
          .filter(t => t.status === 'COMPLETED')
          .reduce((sum, t) => sum + Number(t.amount), 0),
      })),
    };
  } catch (error) {
    console.error('List virtual cards error:', error);
    return { success: false, cards: [] };
  }
}

/**
 * Get card details including sensitive info (requires additional Stripe call)
 */
export async function getCardDetails(cardId: string): Promise<{
  success: boolean;
  card?: {
    id: string;
    name: string;
    last4: string;
    number?: string; // Full card number (if requested)
    cvc?: string;
    expiryMonth: number;
    expiryYear: number;
    spendingLimit: number;
    status: CardStatus;
  };
  error?: string;
}> {
  try {
    const dbCard = await prisma.virtualCard.findUnique({
      where: { id: cardId },
    });

    if (!dbCard) {
      return { success: false, error: 'Card not found' };
    }

    return {
      success: true,
      card: {
        id: dbCard.id,
        name: dbCard.name,
        last4: dbCard.last4,
        expiryMonth: dbCard.expiryMonth,
        expiryYear: dbCard.expiryYear,
        spendingLimit: Number(dbCard.spendingLimit),
        status: dbCard.status,
      },
    };
  } catch (error) {
    console.error('Get card details error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get card details',
    };
  }
}

/**
 * Get full card number and CVC (for making purchases)
 * This requires Stripe's sensitive card details API
 */
export async function getCardSensitiveDetails(stripeCardId: string): Promise<{
  success: boolean;
  number?: string;
  cvc?: string;
  error?: string;
}> {
  try {
    // Get ephemeral key for sensitive details
    // Note: This requires special permissions from Stripe
    const cardDetails = await getStripe().issuing.cards.retrieve(stripeCardId, {
      expand: ['number', 'cvc'],
    });

    return {
      success: true,
      number: cardDetails.number,
      cvc: cardDetails.cvc,
    };
  } catch (error) {
    console.error('Get sensitive card details error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get card details',
    };
  }
}

/**
 * Freeze a virtual card
 */
export async function freezeCard(cardId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const dbCard = await prisma.virtualCard.findUnique({
      where: { id: cardId },
    });

    if (!dbCard) {
      return { success: false, error: 'Card not found' };
    }

    // Update in Stripe
    await getStripe().issuing.cards.update(dbCard.stripeCardId, {
      status: 'inactive',
    });

    // Update in database
    await prisma.virtualCard.update({
      where: { id: cardId },
      data: { status: 'FROZEN' },
    });

    return { success: true };
  } catch (error) {
    console.error('Freeze card error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to freeze card',
    };
  }
}

/**
 * Unfreeze a virtual card
 */
export async function unfreezeCard(cardId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const dbCard = await prisma.virtualCard.findUnique({
      where: { id: cardId },
    });

    if (!dbCard) {
      return { success: false, error: 'Card not found' };
    }

    // Update in Stripe
    await getStripe().issuing.cards.update(dbCard.stripeCardId, {
      status: 'active',
    });

    // Update in database
    await prisma.virtualCard.update({
      where: { id: cardId },
      data: { status: 'ACTIVE' },
    });

    return { success: true };
  } catch (error) {
    console.error('Unfreeze card error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unfreeze card',
    };
  }
}

/**
 * Cancel a virtual card permanently
 */
export async function cancelCard(cardId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const dbCard = await prisma.virtualCard.findUnique({
      where: { id: cardId },
    });

    if (!dbCard) {
      return { success: false, error: 'Card not found' };
    }

    // Update in Stripe
    await getStripe().issuing.cards.update(dbCard.stripeCardId, {
      status: 'canceled',
    });

    // Update in database
    await prisma.virtualCard.update({
      where: { id: cardId },
      data: { status: 'CANCELLED' },
    });

    return { success: true };
  } catch (error) {
    console.error('Cancel card error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel card',
    };
  }
}

/**
 * Update card spending limit
 */
export async function updateSpendingLimit(
  cardId: string,
  newLimit: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbCard = await prisma.virtualCard.findUnique({
      where: { id: cardId },
    });

    if (!dbCard) {
      return { success: false, error: 'Card not found' };
    }

    // Update in Stripe
    await getStripe().issuing.cards.update(dbCard.stripeCardId, {
      spending_controls: {
        spending_limits: [
          {
            amount: Math.round(newLimit * 100),
            interval: 'per_authorization',
          },
        ],
      },
    });

    // Update in database
    await prisma.virtualCard.update({
      where: { id: cardId },
      data: { spendingLimit: newLimit },
    });

    return { success: true };
  } catch (error) {
    console.error('Update spending limit error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update spending limit',
    };
  }
}

/**
 * Get transactions for a card
 */
export async function getCardTransactions(cardId: string): Promise<{
  success: boolean;
  transactions: {
    id: string;
    merchantName: string;
    merchantCategory?: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
    expenseId?: string;
  }[];
}> {
  try {
    const transactions = await prisma.supplierTransaction.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      transactions: transactions.map(t => ({
        id: t.id,
        merchantName: t.merchantName,
        merchantCategory: t.merchantCategory || undefined,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        createdAt: t.createdAt,
        expenseId: t.expenseId || undefined,
      })),
    };
  } catch (error) {
    console.error('Get card transactions error:', error);
    return { success: false, transactions: [] };
  }
}

/**
 * Get all transactions across all cards
 */
export async function getAllTransactions(limit: number = 50): Promise<{
  success: boolean;
  transactions: {
    id: string;
    cardLast4: string;
    merchantName: string;
    merchantCategory?: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
    expenseId?: string;
  }[];
}> {
  try {
    const transactions = await prisma.supplierTransaction.findMany({
      include: {
        card: {
          select: { last4: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      success: true,
      transactions: transactions.map(t => ({
        id: t.id,
        cardLast4: t.card.last4,
        merchantName: t.merchantName,
        merchantCategory: t.merchantCategory || undefined,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        createdAt: t.createdAt,
        expenseId: t.expenseId || undefined,
      })),
    };
  } catch (error) {
    console.error('Get all transactions error:', error);
    return { success: false, transactions: [] };
  }
}

/**
 * Get Stripe Issuing status for the admin dashboard
 */
export async function getIssuingStatus(): Promise<{
  enabled: boolean;
  cardCount: number;
  totalSpendingLimit: number;
  totalSpent: number;
  pendingTransactions: number;
}> {
  const enabled = await isIssuingEnabled();

  if (!enabled) {
    return {
      enabled: false,
      cardCount: 0,
      totalSpendingLimit: 0,
      totalSpent: 0,
      pendingTransactions: 0,
    };
  }

  const cards = await prisma.virtualCard.findMany({
    where: { status: 'ACTIVE' },
    include: {
      transactions: {
        where: { status: 'COMPLETED' },
        select: { amount: true },
      },
    },
  });

  const pendingCount = await prisma.supplierTransaction.count({
    where: { status: 'PENDING' },
  });

  return {
    enabled: true,
    cardCount: cards.length,
    totalSpendingLimit: cards.reduce((sum, c) => sum + Number(c.spendingLimit), 0),
    totalSpent: cards.reduce(
      (sum, c) => sum + c.transactions.reduce((s, t) => s + Number(t.amount), 0),
      0
    ),
    pendingTransactions: pendingCount,
  };
}
