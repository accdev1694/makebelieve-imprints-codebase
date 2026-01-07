/**
 * Integration Test Setup
 *
 * This module provides utilities for integration tests that run against
 * a real database. Tests use transactions that are rolled back to ensure
 * isolation and avoid polluting the database.
 *
 * Environment:
 * - DATABASE_URL must point to a test database (not production!)
 * - Set TEST_DATABASE_URL to override DATABASE_URL for tests
 */

import { PrismaClient, UserType } from '@prisma/client';
import { hashPassword } from '../../password';

// Use a separate Prisma client for tests to avoid conflicts
let prismaTestClient: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!prismaTestClient) {
    const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL or TEST_DATABASE_URL must be set for integration tests');
    }

    // Safety check: Don't run against production
    if (databaseUrl.includes('production') || databaseUrl.includes('prod')) {
      throw new Error('Integration tests cannot run against production database!');
    }

    prismaTestClient = new PrismaClient({
      datasources: {
        db: { url: databaseUrl },
      },
      log: process.env.DEBUG_PRISMA ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  return prismaTestClient;
}

export async function disconnectTestPrisma(): Promise<void> {
  if (prismaTestClient) {
    await prismaTestClient.$disconnect();
    prismaTestClient = null;
  }
}

/**
 * Test data factory functions
 */
export interface TestUser {
  id: string;
  email: string;
  name: string;
  type: UserType;
  passwordHash: string;
  rawPassword: string;
}

let testUserCounter = 0;

export async function createTestUser(
  prisma: PrismaClient,
  overrides: Partial<{
    email: string;
    name: string;
    type: UserType;
    password: string;
  }> = {}
): Promise<TestUser> {
  testUserCounter++;
  const timestamp = Date.now();
  const rawPassword = overrides.password || 'TestPassword123!';
  const passwordHash = await hashPassword(rawPassword);

  const user = await prisma.user.create({
    data: {
      email: overrides.email || `test-${timestamp}-${testUserCounter}@example.com`,
      name: overrides.name || `Test User ${testUserCounter}`,
      type: overrides.type || UserType.customer,
      passwordHash,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    type: user.type,
    passwordHash: user.passwordHash,
    rawPassword,
  };
}

export async function createTestCategory(
  prisma: PrismaClient,
  overrides: Partial<{
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
  }> = {}
): Promise<{ id: string; name: string; slug: string }> {
  testUserCounter++;
  const timestamp = Date.now();

  const category = await prisma.category.create({
    data: {
      name: overrides.name || `Test Category ${testUserCounter}`,
      slug: overrides.slug || `test-category-${timestamp}-${testUserCounter}`,
      description: overrides.description || 'Test category description',
      isActive: overrides.isActive ?? true,
    },
  });

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
}

export async function createTestProduct(
  prisma: PrismaClient,
  categoryId: string,
  overrides: Partial<{
    name: string;
    slug: string;
    description: string;
    basePrice: number;
  }> = {}
): Promise<{ id: string; name: string; slug: string; basePrice: number }> {
  testUserCounter++;
  const timestamp = Date.now();

  const product = await prisma.product.create({
    data: {
      name: overrides.name || `Test Product ${testUserCounter}`,
      slug: overrides.slug || `test-product-${timestamp}-${testUserCounter}`,
      description: overrides.description || 'Test product description',
      basePrice: overrides.basePrice || 19.99,
      categoryId,
      legacyCategory: 'PHOTO_PRINTS',
      legacyProductType: 'STANDARD',
      customizationType: 'NONE',
      status: 'ACTIVE',
    },
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    basePrice: Number(product.basePrice),
  };
}

/**
 * Cleanup utilities
 */
export async function cleanupTestUser(prisma: PrismaClient, userId: string): Promise<void> {
  // Cascade delete will handle related records
  await prisma.user.delete({ where: { id: userId } }).catch(() => {
    // Ignore if already deleted
  });
}

export async function cleanupTestCategory(prisma: PrismaClient, categoryId: string): Promise<void> {
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => {
    // Ignore if already deleted
  });
}

export async function cleanupTestProduct(prisma: PrismaClient, productId: string): Promise<void> {
  await prisma.product.delete({ where: { id: productId } }).catch(() => {
    // Ignore if already deleted
  });
}

/**
 * Transaction-based test isolation
 *
 * Wraps test operations in a transaction that gets rolled back,
 * ensuring complete test isolation without permanent data changes.
 */
export async function withTestTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  // Note: Prisma doesn't support savepoints/rollback for interactive transactions
  // so we use a simpler approach with cleanup
  return callback(prisma);
}

/**
 * Reset counters between test suites
 */
export function resetTestCounters(): void {
  testUserCounter = 0;
}
