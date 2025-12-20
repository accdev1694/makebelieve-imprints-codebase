/**
 * Jest test setup
 * Runs before all tests
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';

// Clean up database before all tests
beforeAll(async () => {
  // Clean up test data
  await cleanDatabase();
});

// Clean up after each test
afterEach(async () => {
  await cleanDatabase();
});

// Disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Clean all tables in the database
 */
async function cleanDatabase() {
  const tables = [
    'RefreshToken',
    'Review',
    'InventoryUsage',
    'InventoryAddition',
    'Inventory',
    'Expense',
    'Payment',
    'Invoice',
    'Order',
    'Design',
    'UserPreference',
    'User',
    'Supplier',
    'FinancialReport',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (error) {
      // Table might not exist yet, skip
      console.warn(`Could not truncate table ${table}:`, error);
    }
  }
}

export { prisma };
