/**
 * Auth Service Integration Tests
 *
 * These tests run against a real database to verify:
 * - User registration creates proper DB records
 * - Login validates credentials against real password hashes
 * - Token refresh works with actual stored tokens
 * - Password reset flow with real token storage
 *
 * Run with: npm test -- --testPathPattern=integration
 */

import { UserType } from '@prisma/client';
import {
  getTestPrisma,
  disconnectTestPrisma,
  createTestUser,
  cleanupTestUser,
  resetTestCounters,
  TestUser,
} from '../helpers/db-test-utils';
import {
  register,
  login,
  logout,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  UserNotFoundError,
  InvalidPasswordError,
} from '../../auth-service';
import { verifyAccessToken, verifyRefreshToken } from '../../jwt';

// Skip unless explicitly enabled with RUN_INTEGRATION_TESTS=true
// This prevents accidentally running against production databases
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Auth Service Integration', () => {
  const prisma = getTestPrisma();
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // Verify database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup all test users
    for (const userId of createdUserIds) {
      await cleanupTestUser(prisma, userId);
    }
    await disconnectTestPrisma();
  });

  beforeEach(() => {
    resetTestCounters();
  });

  describe('register', () => {
    it('should create a new user in the database', async () => {
      const email = `register-test-${Date.now()}@example.com`;

      const result = await register({
        email,
        password: 'SecurePassword123!',
        name: 'Test User',
      });

      // Track for cleanup
      createdUserIds.push(result.user.id);

      // Verify user was created
      expect(result.user.email).toBe(email);
      expect(result.user.name).toBe('Test User');
      expect(result.user.type).toBe(UserType.customer);

      // Verify tokens are valid
      const decoded = verifyAccessToken(result.tokens.accessToken);
      expect(decoded?.userId).toBe(result.user.id);

      // Verify user exists in DB
      const dbUser = await prisma.user.findUnique({
        where: { id: result.user.id },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.email).toBe(email);

      // Verify refresh token was stored
      const refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: result.user.id },
      });
      expect(refreshTokens.length).toBe(1);
    });

    it('should reject duplicate email registration', async () => {
      const email = `duplicate-test-${Date.now()}@example.com`;

      // First registration
      const result = await register({
        email,
        password: 'SecurePassword123!',
        name: 'First User',
      });
      createdUserIds.push(result.user.id);

      // Second registration should fail
      await expect(
        register({
          email,
          password: 'AnotherPassword123!',
          name: 'Second User',
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should create admin user when specified', async () => {
      const email = `admin-test-${Date.now()}@example.com`;

      const result = await register({
        email,
        password: 'AdminPassword123!',
        name: 'Admin User',
        type: UserType.admin,
      });
      createdUserIds.push(result.user.id);

      expect(result.user.type).toBe(UserType.admin);

      // Verify in DB
      const dbUser = await prisma.user.findUnique({
        where: { id: result.user.id },
      });
      expect(dbUser?.type).toBe(UserType.admin);
    });
  });

  describe('login', () => {
    let testUser: TestUser;

    beforeAll(async () => {
      testUser = await createTestUser(prisma, {
        email: `login-test-${Date.now()}@example.com`,
        password: 'LoginPassword123!',
      });
      createdUserIds.push(testUser.id);
    });

    it('should authenticate valid credentials', async () => {
      const result = await login({
        email: testUser.email,
        password: testUser.rawPassword,
      });

      expect(result.user.id).toBe(testUser.id);
      expect(result.user.email).toBe(testUser.email);

      // Verify access token
      const decoded = verifyAccessToken(result.tokens.accessToken);
      expect(decoded?.userId).toBe(testUser.id);

      // Verify refresh token was stored
      const refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.id },
      });
      expect(refreshTokens.length).toBeGreaterThan(0);
    });

    it('should throw UserNotFoundError for non-existent email', async () => {
      await expect(
        login({
          email: 'nonexistent@example.com',
          password: 'any-password',
        })
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should throw InvalidPasswordError for wrong password', async () => {
      await expect(
        login({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
      ).rejects.toThrow(InvalidPasswordError);
    });
  });

  describe('refreshAccessToken', () => {
    let testUser: TestUser;
    let validRefreshToken: string;

    beforeAll(async () => {
      testUser = await createTestUser(prisma, {
        email: `refresh-test-${Date.now()}@example.com`,
      });
      createdUserIds.push(testUser.id);

      // Login to get a valid refresh token
      const loginResult = await login({
        email: testUser.email,
        password: testUser.rawPassword,
      });
      validRefreshToken = loginResult.tokens.refreshToken;
    });

    it('should issue new tokens with valid refresh token', async () => {
      const newTokens = await refreshAccessToken(validRefreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();

      // New access token should be valid
      const decoded = verifyAccessToken(newTokens.accessToken);
      expect(decoded?.userId).toBe(testUser.id);

      // Old refresh token should now be invalid (rotation)
      await expect(refreshAccessToken(validRefreshToken)).rejects.toThrow(
        'Invalid or expired refresh token'
      );

      // Update for subsequent tests
      validRefreshToken = newTokens.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      await expect(refreshAccessToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should invalidate refresh token', async () => {
      // Create user and login
      const testUser = await createTestUser(prisma, {
        email: `logout-test-${Date.now()}@example.com`,
      });
      createdUserIds.push(testUser.id);

      const loginResult = await login({
        email: testUser.email,
        password: testUser.rawPassword,
      });

      // Verify token exists
      const tokensBefore = await prisma.refreshToken.findMany({
        where: { userId: testUser.id },
      });
      expect(tokensBefore.length).toBeGreaterThan(0);

      // Logout
      await logout(loginResult.tokens.refreshToken);

      // Verify token is deleted
      const tokensAfter = await prisma.refreshToken.findMany({
        where: { userId: testUser.id },
      });
      expect(tokensAfter.length).toBe(tokensBefore.length - 1);
    });
  });

  describe('password reset flow', () => {
    let testUser: TestUser;

    beforeAll(async () => {
      testUser = await createTestUser(prisma, {
        email: `reset-test-${Date.now()}@example.com`,
        password: 'OriginalPassword123!',
      });
      createdUserIds.push(testUser.id);
    });

    it('should create password reset token', async () => {
      // Mock email sending
      jest.mock('../../email', () => ({
        sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      }));

      const result = await requestPasswordReset(testUser.email);

      expect(result.success).toBe(true);

      // Verify token was created in DB
      const resetTokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUser.id, used: false },
      });
      expect(resetTokens.length).toBe(1);
      expect(resetTokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should not reveal if email does not exist', async () => {
      const result = await requestPasswordReset('nonexistent@example.com');

      // Should return success to prevent email enumeration
      expect(result.success).toBe(true);
    });

    it('should reset password with valid token', async () => {
      // Get the reset token from DB (in real scenario, this comes from email link)
      const resetTokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: testUser.id, used: false },
      });

      // We need the raw token, not the hash. Since we can't get it,
      // we'll create a new one directly for testing
      const crypto = await import('crypto');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Delete existing tokens and create new one with known raw value
      await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.id } });
      await prisma.passwordResetToken.create({
        data: {
          userId: testUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Reset password
      const newPassword = 'NewSecurePassword123!';
      const result = await resetPassword(rawToken, newPassword);

      expect(result.success).toBe(true);

      // Should be able to login with new password
      const loginResult = await login({
        email: testUser.email,
        password: newPassword,
      });
      expect(loginResult.user.id).toBe(testUser.id);
    });

    it('should reject expired reset token', async () => {
      const crypto = await import('crypto');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Create expired token
      await prisma.passwordResetToken.create({
        data: {
          userId: testUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() - 1000), // Already expired
        },
      });

      await expect(resetPassword(rawToken, 'NewPassword123!')).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('should reject weak password on reset', async () => {
      const crypto = await import('crypto');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          userId: testUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await expect(resetPassword(rawToken, 'weak')).rejects.toThrow();
    });
  });
});
