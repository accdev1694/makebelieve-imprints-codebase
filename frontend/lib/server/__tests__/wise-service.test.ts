/**
 * Wise Service Tests
 *
 * Tests the utility functions and business logic in the Wise service.
 * External API calls are mocked.
 */

import { mockReset, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, ExpenseCategory, WiseAccount, WiseTransaction, WiseBalance, Expense } from '@prisma/client';

// Mock prisma
jest.mock('@/lib/prisma', () => {
  const mock = jest.requireActual('jest-mock-extended').mockDeep();
  return {
    __esModule: true,
    default: mock,
    prisma: mock,
  };
});

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import prismaImport from '@/lib/prisma';
const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

// Import after mocks
import {
  getProfiles,
  getBalances,
  getCards,
  syncWiseTransactions,
  connectWiseAccount,
  disconnectWiseAccount,
  getWiseAccounts,
  getWiseTransactions,
  getSyncStatus,
} from '../wise-service';

describe('Wise Service', () => {
  const mockApiToken = 'test-api-token';

  beforeEach(() => {
    mockReset(prisma);
    mockFetch.mockReset();
    process.env.WISE_API_TOKEN = mockApiToken;
  });

  afterEach(() => {
    delete process.env.WISE_API_TOKEN;
  });

  describe('getProfiles', () => {
    it('should fetch profiles from Wise API', async () => {
      const mockProfiles = [
        { id: 123, type: 'PERSONAL', details: { firstName: 'John', lastName: 'Doe' } },
        { id: 456, type: 'BUSINESS', details: { name: 'Test Business' } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfiles),
      });

      const profiles = await getProfiles();

      expect(profiles).toEqual(mockProfiles);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/profiles'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiToken}`,
          }),
        })
      );
    });

    it('should throw error when API returns non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(getProfiles()).rejects.toThrow('Wise API error: 401');
    });

    it('should use custom API token when provided', async () => {
      const customToken = 'custom-token';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getProfiles(customToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${customToken}`,
          }),
        })
      );
    });
  });

  describe('getBalances', () => {
    it('should fetch balances for a profile', async () => {
      const mockBalances = [
        { id: 1, currency: 'GBP', amount: { value: 1000, currency: 'GBP' } },
        { id: 2, currency: 'USD', amount: { value: 500, currency: 'USD' } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBalances),
      });

      const balances = await getBalances(123);

      expect(balances).toEqual(mockBalances);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v4/profiles/123/balances'),
        expect.any(Object)
      );
    });
  });

  describe('getCards', () => {
    it('should fetch cards for a profile', async () => {
      const mockCards = [
        { id: 'card-1', token: 'tok_123', status: 'ACTIVE', lastFourDigits: '1234' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCards),
      });

      const cards = await getCards(123);

      expect(cards).toEqual(mockCards);
    });

    it('should return empty array on API error (personal accounts)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      });

      const cards = await getCards(123);

      expect(cards).toEqual([]);
    });
  });

  describe('syncWiseTransactions', () => {
    const mockAccount: WiseAccount = {
      id: 'acc-123',
      profileId: '456',
      profileType: 'BUSINESS',
      name: 'Test Account',
      apiToken: 'test-token',
      isActive: true,
      autoCreateExpense: true,
      defaultExpenseCategory: null,
      syncFrequency: 60,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin-123',
    };

    it('should return error when account not found', async () => {
      prisma.wiseAccount.findUnique.mockResolvedValue(null);

      const result = await syncWiseTransactions('non-existent');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Account not found');
    });

    it('should return error when API token not configured', async () => {
      prisma.wiseAccount.findUnique.mockResolvedValue({
        ...mockAccount,
        apiToken: null,
      });

      const result = await syncWiseTransactions('acc-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('API token not configured');
    });

    it('should sync transactions and create expenses', async () => {
      const mockTransactions = [
        {
          type: 'CARD',
          date: '2024-01-15T10:00:00Z',
          amount: { value: -50.00, currency: 'GBP' },
          totalFees: { value: 0, currency: 'GBP' },
          details: {
            type: 'CARD_PAYMENT',
            description: 'Office Supplies Store',
            merchant: { name: 'Staples', category: 'Office Supplies' },
          },
          runningBalance: { value: 950, currency: 'GBP' },
          referenceNumber: 'TXN-001',
        },
      ];

      prisma.wiseAccount.findUnique.mockResolvedValue(mockAccount);

      // Mock getBalances API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, currency: 'GBP', amount: { value: 1000, currency: 'GBP' } },
        ]),
      });

      // Mock getStatement API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          transactions: mockTransactions,
        }),
      });

      // No existing transaction
      prisma.wiseTransaction.findUnique.mockResolvedValue(null);

      // Mock transaction creation
      prisma.wiseTransaction.create.mockResolvedValue({
        id: 'tx-123',
      } as WiseTransaction);

      // Mock expense count for number generation
      prisma.expense.count.mockResolvedValue(0);

      // Mock expense creation
      prisma.expense.create.mockResolvedValue({
        id: 'exp-123',
      } as Expense);

      // Mock transaction update
      prisma.wiseTransaction.update.mockResolvedValue({} as WiseTransaction);

      // Mock account update
      prisma.wiseAccount.update.mockResolvedValue({} as WiseAccount);

      // Mock balance update (getBalances call again)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, currency: 'GBP', amount: { value: 950, currency: 'GBP' } },
        ]),
      });

      // Mock balance upsert
      prisma.wiseBalance.upsert.mockResolvedValue({} as WiseBalance);

      const result = await syncWiseTransactions('acc-123');

      expect(result.success).toBe(true);
      expect(result.synced).toBe(1);
      expect(result.skipped).toBe(0);
      expect(prisma.wiseTransaction.create).toHaveBeenCalled();
      expect(prisma.expense.create).toHaveBeenCalled();
    });

    it('should skip already synced transactions', async () => {
      prisma.wiseAccount.findUnique.mockResolvedValue(mockAccount);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, currency: 'GBP', amount: { value: 1000, currency: 'GBP' } },
        ]),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          transactions: [
            {
              referenceNumber: 'EXISTING-TXN',
              type: 'CARD',
              date: '2024-01-15',
              amount: { value: -25, currency: 'GBP' },
              details: { type: 'CARD_PAYMENT', description: 'Test' },
              runningBalance: { value: 975, currency: 'GBP' },
            },
          ],
        }),
      });

      // Existing transaction found
      prisma.wiseTransaction.findUnique.mockResolvedValue({
        id: 'existing-tx',
      } as WiseTransaction);

      prisma.wiseAccount.update.mockResolvedValue({} as WiseAccount);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await syncWiseTransactions('acc-123');

      expect(result.skipped).toBe(1);
      expect(result.synced).toBe(0);
      expect(prisma.wiseTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('connectWiseAccount', () => {
    it('should connect a new Wise account', async () => {
      const mockProfiles = [
        { id: 789, type: 'BUSINESS', details: { name: 'My Business' } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfiles),
      });

      prisma.wiseAccount.findUnique.mockResolvedValue(null);

      prisma.wiseAccount.create.mockResolvedValue({
        id: 'new-acc-123',
        profileId: '789',
      } as WiseAccount);

      // Mock subsequent sync calls
      prisma.wiseAccount.findUnique.mockResolvedValueOnce(null);

      const result = await connectWiseAccount('new-token', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('new-acc-123');
      expect(prisma.wiseAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          profileId: '789',
          profileType: 'BUSINESS',
          name: 'My Business',
          apiToken: 'new-token',
          createdBy: 'admin-123',
        }),
      });
    });

    it('should return error when no profiles found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await connectWiseAccount('token', 'admin');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No profiles found for this API token');
    });

    it('should prefer Business profile over Personal', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, type: 'PERSONAL', details: { firstName: 'John', lastName: 'Doe' } },
          { id: 2, type: 'BUSINESS', details: { name: 'Business Corp' } },
        ]),
      });

      prisma.wiseAccount.findUnique.mockResolvedValue(null);
      prisma.wiseAccount.create.mockResolvedValue({ id: 'acc', profileId: '2' } as WiseAccount);

      await connectWiseAccount('token', 'admin');

      expect(prisma.wiseAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          profileId: '2',
          profileType: 'BUSINESS',
        }),
      });
    });

    it('should update existing account if already connected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 123, type: 'BUSINESS', details: { name: 'Existing' } },
        ]),
      });

      prisma.wiseAccount.findUnique.mockResolvedValue({
        id: 'existing-acc',
        profileId: '123',
      } as WiseAccount);

      prisma.wiseAccount.update.mockResolvedValue({
        id: 'existing-acc',
      } as WiseAccount);

      const result = await connectWiseAccount('new-token', 'admin');

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('existing-acc');
      expect(prisma.wiseAccount.update).toHaveBeenCalled();
    });
  });

  describe('disconnectWiseAccount', () => {
    it('should deactivate account and clear API token', async () => {
      prisma.wiseAccount.update.mockResolvedValue({} as WiseAccount);

      const result = await disconnectWiseAccount('acc-123');

      expect(result.success).toBe(true);
      expect(prisma.wiseAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-123' },
        data: {
          isActive: false,
          apiToken: null,
        },
      });
    });

    it('should return error on failure', async () => {
      prisma.wiseAccount.update.mockRejectedValue(new Error('DB error'));

      const result = await disconnectWiseAccount('acc-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  describe('getWiseAccounts', () => {
    it('should return all accounts when no adminUserId provided', async () => {
      const mockAccounts = [
        { id: 'acc-1', name: 'Account 1', balances: [], _count: { transactions: 10 } },
        { id: 'acc-2', name: 'Account 2', balances: [], _count: { transactions: 5 } },
      ];

      prisma.wiseAccount.findMany.mockResolvedValue(mockAccounts as never);

      const accounts = await getWiseAccounts();

      expect(accounts).toEqual(mockAccounts);
      expect(prisma.wiseAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should filter by adminUserId when provided', async () => {
      prisma.wiseAccount.findMany.mockResolvedValue([]);

      await getWiseAccounts('admin-123');

      expect(prisma.wiseAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdBy: 'admin-123' },
        })
      );
    });
  });

  describe('getWiseTransactions', () => {
    it('should return paginated transactions', async () => {
      const mockTransactions = [
        { id: 'tx-1', amount: 100 },
        { id: 'tx-2', amount: 200 },
      ];

      prisma.wiseTransaction.findMany.mockResolvedValue(mockTransactions as never);
      prisma.wiseTransaction.count.mockResolvedValue(50);

      const result = await getWiseTransactions({ limit: 10, offset: 0 });

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.total).toBe(50);
    });

    it('should filter by accountId', async () => {
      prisma.wiseTransaction.findMany.mockResolvedValue([]);
      prisma.wiseTransaction.count.mockResolvedValue(0);

      await getWiseTransactions({ accountId: 'acc-123' });

      expect(prisma.wiseTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'acc-123',
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      prisma.wiseTransaction.findMany.mockResolvedValue([]);
      prisma.wiseTransaction.count.mockResolvedValue(0);

      await getWiseTransactions({ startDate, endDate });

      expect(prisma.wiseTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });

    it('should filter by transaction type', async () => {
      prisma.wiseTransaction.findMany.mockResolvedValue([]);
      prisma.wiseTransaction.count.mockResolvedValue(0);

      await getWiseTransactions({ type: 'CARD_PAYMENT' });

      expect(prisma.wiseTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'CARD_PAYMENT',
          }),
        })
      );
    });
  });

  describe('getSyncStatus', () => {
    it('should return accounts that need sync', async () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const recentDate = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

      prisma.wiseAccount.findMany.mockResolvedValue([
        {
          id: 'acc-1',
          name: 'Old Sync',
          profileType: 'BUSINESS',
          lastSyncAt: oldDate,
          syncFrequency: 60, // 60 minutes
          autoCreateExpense: true,
          _count: { transactions: 100 },
        },
        {
          id: 'acc-2',
          name: 'Recent Sync',
          profileType: 'PERSONAL',
          lastSyncAt: recentDate,
          syncFrequency: 60,
          autoCreateExpense: false,
          _count: { transactions: 50 },
        },
      ] as never);

      const status = await getSyncStatus();

      expect(status).toHaveLength(2);
      expect(status[0].needsSync).toBe(true); // Old sync needs update
      expect(status[1].needsSync).toBe(false); // Recent sync doesn't need update
    });

    it('should mark accounts without lastSyncAt as needing sync', async () => {
      prisma.wiseAccount.findMany.mockResolvedValue([
        {
          id: 'acc-1',
          name: 'Never Synced',
          lastSyncAt: null,
          syncFrequency: 60,
          _count: { transactions: 0 },
        },
      ] as never);

      const status = await getSyncStatus();

      expect(status[0].needsSync).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw when WISE_API_TOKEN not configured', async () => {
      delete process.env.WISE_API_TOKEN;

      await expect(getProfiles()).rejects.toThrow('WISE_API_TOKEN is not configured');
    });
  });
});
