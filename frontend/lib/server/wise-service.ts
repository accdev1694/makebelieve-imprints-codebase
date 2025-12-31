/**
 * Wise API Service
 * Integrates with Wise (formerly TransferWise) API for automatic expense capture
 *
 * Supports:
 * - Personal and Business accounts
 * - Card transaction monitoring
 * - Transfer tracking
 * - Multi-currency balances
 * - Auto-expense creation
 */

import prisma from '@/lib/prisma';
import { ExpenseCategory } from '@prisma/client';

const WISE_API_BASE = 'https://api.wise.com';
const WISE_SANDBOX_API_BASE = 'https://api.sandbox.transferwise.tech';

// Use sandbox in development
const API_BASE = process.env.NODE_ENV === 'production' ? WISE_API_BASE : WISE_SANDBOX_API_BASE;

interface WiseProfile {
  id: number;
  type: 'PERSONAL' | 'BUSINESS';
  details: {
    firstName?: string;
    lastName?: string;
    name?: string;
  };
}

interface WiseBalance {
  id: number;
  currency: string;
  amount: {
    value: number;
    currency: string;
  };
  reservedAmount?: {
    value: number;
    currency: string;
  };
}

interface WiseStatement {
  accountHolder: {
    type: string;
    address: {
      addressFirstLine: string;
      city: string;
      postCode: string;
      stateCode: string;
      countryName: string;
    };
    firstName: string;
    lastName: string;
  };
  issuer: {
    name: string;
    firstLine: string;
    city: string;
    postCode: string;
    stateCode: string;
    country: string;
  };
  transactions: WiseApiTransaction[];
}

interface WiseApiTransaction {
  type: string;
  date: string;
  amount: {
    value: number;
    currency: string;
  };
  totalFees?: {
    value: number;
    currency: string;
  };
  details: {
    type: string;
    description: string;
    amount?: {
      value: number;
      currency: string;
    };
    category?: string;
    merchant?: {
      name: string;
      categoryCode?: string;
      category?: string;
      city?: string;
      country?: string;
    };
    senderName?: string;
    senderAccount?: string;
    paymentReference?: string;
  };
  exchangeDetails?: {
    rate: number;
    fromAmount: {
      value: number;
      currency: string;
    };
    toAmount: {
      value: number;
      currency: string;
    };
  };
  runningBalance: {
    value: number;
    currency: string;
  };
  referenceNumber: string;
}

interface WiseCard {
  id: string;
  token: string;
  status: string;
  lastFourDigits: string;
  cardHolderName: string;
  expirationDate: string;
}

/**
 * Get API token from environment or database
 */
function getApiToken(accountToken?: string): string {
  const token = accountToken || process.env.WISE_API_TOKEN;
  if (!token) {
    throw new Error('WISE_API_TOKEN is not configured');
  }
  return token;
}

/**
 * Make authenticated request to Wise API
 */
async function wiseApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  apiToken?: string
): Promise<T> {
  const token = getApiToken(apiToken);

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Wise API error: ${response.status} - ${errorText}`);
    throw new Error(`Wise API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get all profiles (personal and business) for the authenticated user
 */
export async function getProfiles(apiToken?: string): Promise<WiseProfile[]> {
  return wiseApiRequest<WiseProfile[]>('/v1/profiles', {}, apiToken);
}

/**
 * Get balances for a profile
 */
export async function getBalances(profileId: number, apiToken?: string): Promise<WiseBalance[]> {
  return wiseApiRequest<WiseBalance[]>(`/v4/profiles/${profileId}/balances?types=STANDARD`, {}, apiToken);
}

/**
 * Get account statement (transactions) for a balance
 */
export async function getStatement(
  profileId: number,
  balanceId: number,
  currency: string,
  startDate: Date,
  endDate: Date,
  apiToken?: string
): Promise<WiseStatement> {
  const params = new URLSearchParams({
    currency,
    intervalStart: startDate.toISOString(),
    intervalEnd: endDate.toISOString(),
    type: 'COMPACT',
  });

  return wiseApiRequest<WiseStatement>(
    `/v1/profiles/${profileId}/balance-statements/${balanceId}/statement.json?${params}`,
    {},
    apiToken
  );
}

/**
 * Get transactions for a profile (all currencies)
 */
export async function getTransactions(
  profileId: number,
  startDate: Date,
  endDate: Date,
  apiToken?: string
): Promise<WiseApiTransaction[]> {
  // Get all balances first
  const balances = await getBalances(profileId, apiToken);

  const allTransactions: WiseApiTransaction[] = [];

  // Get statement for each balance
  for (const balance of balances) {
    try {
      const statement = await getStatement(
        profileId,
        balance.id,
        balance.currency,
        startDate,
        endDate,
        apiToken
      );
      allTransactions.push(...statement.transactions);
    } catch (error) {
      console.error(`Error fetching ${balance.currency} statement:`, error);
    }
  }

  return allTransactions;
}

/**
 * Get cards for a profile (business accounts only)
 */
export async function getCards(profileId: number, apiToken?: string): Promise<WiseCard[]> {
  try {
    return await wiseApiRequest<WiseCard[]>(`/v3/spend/profiles/${profileId}/cards`, {}, apiToken);
  } catch {
    // Personal accounts may not have card access
    return [];
  }
}

/**
 * Map Wise transaction type to our enum
 */
function mapTransactionType(wiseType: string): 'CARD_PAYMENT' | 'CARD_REFUND' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'CONVERSION' | 'DIRECT_DEBIT' | 'ATM_WITHDRAWAL' | 'FEE' | 'OTHER' {
  const typeMap: Record<string, 'CARD_PAYMENT' | 'CARD_REFUND' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'CONVERSION' | 'DIRECT_DEBIT' | 'ATM_WITHDRAWAL' | 'FEE' | 'OTHER'> = {
    'CARD': 'CARD_PAYMENT',
    'CARD_PAYMENT': 'CARD_PAYMENT',
    'CARD_REFUND': 'CARD_REFUND',
    'TRANSFER': 'TRANSFER_OUT',
    'MONEY_ADDED': 'TRANSFER_IN',
    'CONVERSION': 'CONVERSION',
    'DIRECT_DEBIT': 'DIRECT_DEBIT',
    'ATM': 'ATM_WITHDRAWAL',
    'CASHBACK': 'TRANSFER_IN',
    'FEE': 'FEE',
  };

  return typeMap[wiseType] || 'OTHER';
}

/**
 * Map merchant category code to expense category
 */
function mapMerchantToExpenseCategory(mcc?: string, category?: string): ExpenseCategory {
  // MCC code mapping
  if (mcc) {
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

    // Packaging
    if ([5099, 5113].includes(mccNum)) return 'PACKAGING';
  }

  // Category string mapping
  if (category) {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('office') || lowerCategory.includes('stationery')) return 'MATERIALS';
    if (lowerCategory.includes('software') || lowerCategory.includes('subscription')) return 'SOFTWARE';
    if (lowerCategory.includes('shipping') || lowerCategory.includes('courier')) return 'SHIPPING_SUPPLIES';
    if (lowerCategory.includes('marketing') || lowerCategory.includes('advertising')) return 'MARKETING';
    if (lowerCategory.includes('equipment') || lowerCategory.includes('electronics')) return 'EQUIPMENT';
    if (lowerCategory.includes('packaging')) return 'PACKAGING';
    if (lowerCategory.includes('utilities')) return 'UTILITIES';
  }

  return 'OTHER';
}

/**
 * Get UK tax year for a date
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
 * Convert amount to GBP if needed
 */
async function convertToGBP(
  amount: number,
  currency: string,
  exchangeRate?: number
): Promise<number> {
  if (currency === 'GBP') return amount;

  // Use provided exchange rate or fetch current rate
  if (exchangeRate) {
    return amount * exchangeRate;
  }

  // For now, return the amount as-is (in production, fetch live rate)
  return amount;
}

/**
 * Sync transactions from Wise and create expenses
 */
export async function syncWiseTransactions(
  accountId: string,
  options?: { startDate?: Date; endDate?: Date }
): Promise<{
  success: boolean;
  synced: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  try {
    // Get account from database
    const account = await prisma.wiseAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return { success: false, synced: 0, skipped: 0, errors: ['Account not found'] };
    }

    if (!account.apiToken) {
      return { success: false, synced: 0, skipped: 0, errors: ['API token not configured'] };
    }

    // Default to last 7 days if no dates provided
    const endDate = options?.endDate || new Date();
    const startDate = options?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Fetch transactions from Wise
    const transactions = await getTransactions(
      parseInt(account.profileId),
      startDate,
      endDate,
      account.apiToken
    );

    for (const tx of transactions) {
      try {
        // Check if already synced
        const existing = await prisma.wiseTransaction.findUnique({
          where: { wiseTransactionId: tx.referenceNumber },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Determine transaction direction
        const isOutgoing = tx.amount.value < 0;
        const absAmount = Math.abs(tx.amount.value);

        // Map to our transaction type
        const txType = mapTransactionType(tx.details.type);

        // Convert to GBP for reporting
        const amountInGBP = await convertToGBP(
          absAmount,
          tx.amount.currency,
          tx.exchangeDetails?.rate
        );

        // Create transaction record
        const wiseTx = await prisma.wiseTransaction.create({
          data: {
            accountId: account.id,
            wiseTransactionId: tx.referenceNumber,
            type: txType,
            status: 'COMPLETED',
            direction: isOutgoing ? 'OUTGOING' : 'INCOMING',
            amount: absAmount,
            currency: tx.amount.currency,
            amountInGBP,
            exchangeRate: tx.exchangeDetails?.rate,
            fee: tx.totalFees?.value,
            merchantName: tx.details.merchant?.name || tx.details.description,
            merchantCategory: tx.details.merchant?.category || tx.details.category,
            merchantCategoryCode: tx.details.merchant?.categoryCode,
            description: tx.details.description,
            transactionDate: new Date(tx.date),
            rawData: JSON.parse(JSON.stringify(tx)),
          },
        });

        // Auto-create expense for outgoing card payments
        if (
          account.autoCreateExpense &&
          isOutgoing &&
          ['CARD_PAYMENT', 'DIRECT_DEBIT', 'TRANSFER_OUT'].includes(txType)
        ) {
          const expenseNumber = await generateExpenseNumber();
          const taxYear = getTaxYear(new Date(tx.date));
          const category = mapMerchantToExpenseCategory(
            tx.details.merchant?.categoryCode,
            tx.details.merchant?.category
          );

          // Calculate VAT (assume 20% standard rate for UK purchases)
          const vatAmount = tx.amount.currency === 'GBP' ? absAmount / 6 : 0;

          const expense = await prisma.expense.create({
            data: {
              expenseNumber,
              category,
              description: `${tx.details.merchant?.name || tx.details.description}`,
              amount: amountInGBP,
              currency: 'GBP',
              exchangeRate: tx.exchangeDetails?.rate,
              purchaseDate: new Date(tx.date),
              importSource: 'WISE_API',
              externalReference: tx.referenceNumber,
              vatAmount: vatAmount > 0 ? vatAmount : undefined,
              vatRate: vatAmount > 0 ? 20 : undefined,
              isVatReclaimable: vatAmount > 0,
              taxYear,
              notes: `Auto-imported from Wise - ${tx.amount.currency} ${absAmount.toFixed(2)}`,
              searchMetadata: {
                wiseTransactionId: tx.referenceNumber,
                originalCurrency: tx.amount.currency,
                originalAmount: absAmount,
                merchantCategory: tx.details.merchant?.category,
                merchantCategoryCode: tx.details.merchant?.categoryCode,
              },
            },
          });

          // Link transaction to expense
          await prisma.wiseTransaction.update({
            where: { id: wiseTx.id },
            data: { expenseId: expense.id },
          });
        }

        synced++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Transaction ${tx.referenceNumber}: ${message}`);
      }
    }

    // Update last sync time
    await prisma.wiseAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date() },
    });

    // Update balances
    try {
      const balances = await getBalances(parseInt(account.profileId), account.apiToken);
      for (const balance of balances) {
        await prisma.wiseBalance.upsert({
          where: {
            accountId_currency: {
              accountId: account.id,
              currency: balance.currency,
            },
          },
          update: {
            amount: balance.amount.value,
            reservedAmount: balance.reservedAmount?.value || 0,
            lastUpdated: new Date(),
          },
          create: {
            accountId: account.id,
            currency: balance.currency,
            amount: balance.amount.value,
            reservedAmount: balance.reservedAmount?.value || 0,
          },
        });
      }
    } catch (error) {
      console.error('Error updating balances:', error);
    }

    return { success: true, synced, skipped, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, synced, skipped, errors: [message] };
  }
}

/**
 * Connect a Wise account
 */
export async function connectWiseAccount(
  apiToken: string,
  adminUserId: string
): Promise<{
  success: boolean;
  accountId?: string;
  error?: string;
}> {
  try {
    // Verify token by fetching profiles
    const profiles = await getProfiles(apiToken);

    if (profiles.length === 0) {
      return { success: false, error: 'No profiles found for this API token' };
    }

    // Use the first profile (typically personal, or business if that's the only one)
    const profile = profiles[0];
    const profileName = profile.type === 'PERSONAL'
      ? `${profile.details.firstName} ${profile.details.lastName}`
      : profile.details.name || 'Business Account';

    // Check if already connected
    const existing = await prisma.wiseAccount.findUnique({
      where: { profileId: String(profile.id) },
    });

    if (existing) {
      // Update existing account
      await prisma.wiseAccount.update({
        where: { id: existing.id },
        data: {
          apiToken,
          isActive: true,
          name: profileName,
        },
      });

      return { success: true, accountId: existing.id };
    }

    // Create new account
    const account = await prisma.wiseAccount.create({
      data: {
        profileId: String(profile.id),
        profileType: profile.type.toUpperCase() as 'PERSONAL' | 'BUSINESS',
        name: profileName,
        apiToken,
        createdBy: adminUserId,
      },
    });

    // Initial sync
    await syncWiseTransactions(account.id, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    });

    return { success: true, accountId: account.id };
  } catch (error) {
    console.error('Connect Wise account error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect account',
    };
  }
}

/**
 * Disconnect a Wise account
 */
export async function disconnectWiseAccount(accountId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await prisma.wiseAccount.update({
      where: { id: accountId },
      data: {
        isActive: false,
        apiToken: null,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect account',
    };
  }
}

/**
 * Get connected Wise accounts
 */
export async function getWiseAccounts(adminUserId?: string) {
  const where = adminUserId ? { createdBy: adminUserId } : {};

  return prisma.wiseAccount.findMany({
    where,
    include: {
      balances: true,
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get Wise transactions with optional filters
 */
export async function getWiseTransactions(options?: {
  accountId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};

  if (options?.accountId) {
    where.accountId = options.accountId;
  }

  if (options?.startDate || options?.endDate) {
    where.transactionDate = {};
    if (options?.startDate) {
      (where.transactionDate as Record<string, unknown>).gte = options.startDate;
    }
    if (options?.endDate) {
      (where.transactionDate as Record<string, unknown>).lte = options.endDate;
    }
  }

  if (options?.type) {
    where.type = options.type;
  }

  const [transactions, total] = await Promise.all([
    prisma.wiseTransaction.findMany({
      where,
      include: {
        expense: {
          select: {
            id: true,
            expenseNumber: true,
            category: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
            profileType: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.wiseTransaction.count({ where }),
  ]);

  return { transactions, total };
}

/**
 * Get sync status for all accounts
 */
export async function getSyncStatus() {
  const accounts = await prisma.wiseAccount.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      profileType: true,
      lastSyncAt: true,
      syncFrequency: true,
      autoCreateExpense: true,
      _count: {
        select: { transactions: true },
      },
    },
  });

  return accounts.map((account) => ({
    ...account,
    needsSync: !account.lastSyncAt ||
      Date.now() - account.lastSyncAt.getTime() > account.syncFrequency * 60 * 1000,
  }));
}

/**
 * Run scheduled sync for all active accounts
 * Call this from a cron job every 5 minutes
 */
export async function runScheduledSync(): Promise<{
  accounts: number;
  synced: number;
  errors: string[];
}> {
  const accounts = await prisma.wiseAccount.findMany({
    where: { isActive: true },
  });

  let totalSynced = 0;
  const allErrors: string[] = [];

  for (const account of accounts) {
    // Check if sync is needed based on frequency
    const lastSync = account.lastSyncAt?.getTime() || 0;
    const syncInterval = account.syncFrequency * 60 * 1000;

    if (Date.now() - lastSync >= syncInterval) {
      const result = await syncWiseTransactions(account.id);
      totalSynced += result.synced;
      allErrors.push(...result.errors.map((e) => `${account.name}: ${e}`));
    }
  }

  return {
    accounts: accounts.length,
    synced: totalSynced,
    errors: allErrors,
  };
}
