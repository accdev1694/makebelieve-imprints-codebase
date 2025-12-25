/**
 * Test helper utilities
 */

import { PrismaClient, UserType } from '@prisma/client';
import { hashPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

const prisma = new PrismaClient();

/**
 * Create a test user
 */
export async function createTestUser(overrides?: {
  email?: string;
  password?: string;
  name?: string;
  type?: UserType;
}) {
  const email = overrides?.email || `test${Date.now()}@example.com`;
  const password = overrides?.password || 'Test123!@#';
  const name = overrides?.name || 'Test User';
  const type = overrides?.type || UserType.customer;

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      type,
    },
  });

  return { user, password };
}

/**
 * Create a test admin user
 */
export async function createTestAdmin(overrides?: {
  email?: string;
  password?: string;
  name?: string;
}) {
  return createTestUser({
    ...overrides,
    type: UserType.admin,
  });
}

/**
 * Generate auth tokens for a user
 */
export function generateTestTokens(userId: string, userType: UserType) {
  const accessToken = generateAccessToken({
    userId,
    type: userType,
  });

  const refreshToken = generateRefreshToken({
    userId,
    type: userType,
  });

  return { accessToken, refreshToken };
}

/**
 * Create a test design
 */
export async function createTestDesign(userId: string, overrides?: {
  title?: string;
  fileUrl?: string;
}) {
  return prisma.design.create({
    data: {
      userId,
      title: overrides?.title || 'Test Design',
      fileUrl: overrides?.fileUrl || 'https://example.com/design.png',
    },
  });
}

/**
 * Create a test order
 */
export async function createTestOrder(
  customerId: string,
  designId: string,
  overrides?: {
    totalPrice?: number;
  }
) {
  return prisma.order.create({
    data: {
      customerId,
      designId,
      printSize: 'A4',
      material: 'MATTE',
      orientation: 'PORTRAIT',
      printWidth: 210,
      printHeight: 297,
      totalPrice: overrides?.totalPrice || 19.99,
      shippingAddress: {
        name: 'Test Customer',
        addressLine1: '123 Test St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
      },
    },
  });
}

/**
 * Extract cookies from response headers
 */
export function extractCookies(headers: Record<string, string | string[]>): {
  accessToken?: string;
  refreshToken?: string;
} {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return {};

  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];

  const accessTokenCookie = cookies.find((c) => c.startsWith('accessToken='));
  const refreshTokenCookie = cookies.find((c) => c.startsWith('refreshToken='));

  return {
    accessToken: accessTokenCookie?.split(';')[0].split('=')[1],
    refreshToken: refreshTokenCookie?.split(';')[0].split('=')[1],
  };
}
