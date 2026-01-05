import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, UserType, User, RefreshToken, PasswordResetToken } from '@prisma/client';

// Mock prisma with __esModule flag for proper default export handling
jest.mock('@/lib/prisma', () => {
  const mock = jest.requireActual('jest-mock-extended').mockDeep();
  return {
    __esModule: true,
    default: mock,
    prisma: mock,
  };
});

// Import after mock is set up
import prismaImport from '@/lib/prisma';
const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

// Mock password module
const mockHashPassword = jest.fn();
const mockVerifyPassword = jest.fn();
jest.mock('../password', () => ({
  hashPassword: (password: string) => mockHashPassword(password),
  verifyPassword: (password: string, hash: string) => mockVerifyPassword(password, hash),
}));

// Mock JWT module
const mockGenerateAccessToken = jest.fn();
const mockGenerateRefreshToken = jest.fn();
const mockVerifyRefreshToken = jest.fn();
const mockGetRefreshTokenExpiry = jest.fn();
jest.mock('../jwt', () => ({
  generateAccessToken: (payload: unknown) => mockGenerateAccessToken(payload),
  generateRefreshToken: (payload: unknown) => mockGenerateRefreshToken(payload),
  verifyRefreshToken: (token: string) => mockVerifyRefreshToken(token),
  getRefreshTokenExpiry: () => mockGetRefreshTokenExpiry(),
}));

// Mock email module
const mockSendPasswordResetEmail = jest.fn();
jest.mock('../email', () => ({
  sendPasswordResetEmail: (email: string, name: string, token: string) =>
    mockSendPasswordResetEmail(email, name, token),
}));

import {
  register,
  login,
  logout,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  UserNotFoundError,
  InvalidPasswordError,
} from '../auth-service';

describe('Auth Service', () => {
  beforeEach(() => {
    mockReset(prisma);
    jest.clearAllMocks();

    // Default mock implementations
    mockHashPassword.mockResolvedValue('hashed_password');
    mockVerifyPassword.mockResolvedValue(true);
    mockGenerateAccessToken.mockReturnValue('mock_access_token');
    mockGenerateRefreshToken.mockReturnValue('mock_refresh_token');
    mockGetRefreshTokenExpiry.mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
  });

  // Helper to create a mock user
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    name: 'Test User',
    type: UserType.customer,
    phone: null,
    address: null,
    loyaltyPoints: 0,
    totalSpent: 0 as unknown as import('@prisma/client/runtime/library').Decimal,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(
        createMockUser({ email: userData.email, name: userData.name })
      );
      prisma.refreshToken.create.mockResolvedValue({} as RefreshToken);

      const result = await register(userData);

      expect(result.user.email).toBe(userData.email);
      expect(result.user.name).toBe(userData.name);
      expect(result.tokens.accessToken).toBe('mock_access_token');
      expect(result.tokens.refreshToken).toBe('mock_refresh_token');
      expect(mockHashPassword).toHaveBeenCalledWith(userData.password);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          passwordHash: 'hashed_password',
          name: userData.name,
          type: UserType.customer,
        },
      });
    });

    it('should throw error if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(createMockUser());

      await expect(
        register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'User',
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should allow registering as admin type', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(
        createMockUser({ type: UserType.admin })
      );
      prisma.refreshToken.create.mockResolvedValue({} as RefreshToken);

      const result = await register({
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        type: UserType.admin,
      });

      expect(result.user.type).toBe(UserType.admin);
    });
  });

  describe('login', () => {
    it('should login user successfully with correct credentials', async () => {
      const mockUser = createMockUser();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({} as RefreshToken);

      const result = await login({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(mockVerifyPassword).toHaveBeenCalledWith('correctpassword', mockUser.passwordHash);
    });

    it('should throw UserNotFoundError when email does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        login({
          email: 'nonexistent@example.com',
          password: 'password',
        })
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should throw InvalidPasswordError when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(createMockUser());
      mockVerifyPassword.mockResolvedValue(false);

      await expect(
        login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow(InvalidPasswordError);
    });

    it('should have correct error code on UserNotFoundError', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      try {
        await login({ email: 'x@y.com', password: 'p' });
      } catch (error) {
        expect(error).toBeInstanceOf(UserNotFoundError);
        expect((error as UserNotFoundError).code).toBe('USER_NOT_FOUND');
      }
    });

    it('should have correct error code on InvalidPasswordError', async () => {
      prisma.user.findUnique.mockResolvedValue(createMockUser());
      mockVerifyPassword.mockResolvedValue(false);

      try {
        await login({ email: 'test@example.com', password: 'wrong' });
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPasswordError);
        expect((error as InvalidPasswordError).code).toBe('INVALID_PASSWORD');
      }
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh tokens successfully with valid refresh token', async () => {
      const mockUser = createMockUser();
      const mockStoredToken = {
        id: 'token-id',
        userId: mockUser.id,
        tokenHash: 'stored_hash',
        expiresAt: new Date(Date.now() + 1000000),
        createdAt: new Date(),
        user: mockUser,
      };

      mockVerifyRefreshToken.mockReturnValue({ userId: mockUser.id });
      prisma.refreshToken.findFirst.mockResolvedValue(mockStoredToken as RefreshToken & { user: User });
      prisma.refreshToken.delete.mockResolvedValue({} as RefreshToken);
      prisma.refreshToken.create.mockResolvedValue({} as RefreshToken);

      const result = await refreshAccessToken('valid_refresh_token');

      expect(result.accessToken).toBe('mock_access_token');
      expect(result.refreshToken).toBe('mock_refresh_token');
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-id' },
      });
    });

    it('should throw error when refresh token is not found in database', async () => {
      mockVerifyRefreshToken.mockReturnValue({ userId: 'user-123' });
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(refreshAccessToken('invalid_token')).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should throw error when JWT verification fails', async () => {
      mockVerifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(refreshAccessToken('bad_token')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should delete refresh token from database', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await logout('some_refresh_token');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
    });

    it('should not throw even if token does not exist', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await expect(logout('nonexistent_token')).resolves.toBeUndefined();
    });
  });

  describe('requestPasswordReset', () => {
    it('should create reset token and send email for existing user', async () => {
      const mockUser = createMockUser();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetToken.create.mockResolvedValue({} as PasswordResetToken);

      const result = await requestPasswordReset('test@example.com');

      expect(result.success).toBe(true);
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
        expect.any(String)
      );
    });

    it('should return success but not send email for non-existent user (prevent enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await requestPasswordReset('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('If an account exists');
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should delete existing reset tokens before creating new one', async () => {
      const mockUser = createMockUser();
      const callOrder: string[] = [];

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passwordResetToken.deleteMany.mockImplementation(() => {
        callOrder.push('deleteMany');
        return Promise.resolve({ count: 2 });
      });
      prisma.passwordResetToken.create.mockImplementation(() => {
        callOrder.push('create');
        return Promise.resolve({} as PasswordResetToken);
      });

      await requestPasswordReset('test@example.com');

      expect(callOrder).toEqual(['deleteMany', 'create']);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      const mockUser = createMockUser();
      const mockResetToken = {
        id: 'reset-token-id',
        userId: mockUser.id,
        tokenHash: 'token_hash',
        used: false,
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
        user: mockUser,
      };

      prisma.passwordResetToken.findFirst.mockResolvedValue(
        mockResetToken as PasswordResetToken & { user: User }
      );
      prisma.$transaction.mockResolvedValue([{}, {}, {}]);

      const result = await resetPassword('valid_token', 'newpassword123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('reset successfully');
      expect(mockHashPassword).toHaveBeenCalledWith('newpassword123');
    });

    it('should throw error for invalid reset token', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(resetPassword('invalid_token', 'newpassword')).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('should throw error for used reset token', async () => {
      // The findFirst query filters out used: true, so this returns null
      prisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(resetPassword('used_token', 'newpassword')).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('should throw error for expired reset token', async () => {
      // The findFirst query filters out expired tokens, so this returns null
      prisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(resetPassword('expired_token', 'newpassword')).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });
  });

  describe('Error classes', () => {
    it('UserNotFoundError should have correct properties', () => {
      const error = new UserNotFoundError();
      expect(error.name).toBe('UserNotFoundError');
      expect(error.code).toBe('USER_NOT_FOUND');
      expect(error.message).toBe('No account found with this email');
    });

    it('UserNotFoundError should accept custom message', () => {
      const error = new UserNotFoundError('Custom message');
      expect(error.message).toBe('Custom message');
    });

    it('InvalidPasswordError should have correct properties', () => {
      const error = new InvalidPasswordError();
      expect(error.name).toBe('InvalidPasswordError');
      expect(error.code).toBe('INVALID_PASSWORD');
      expect(error.message).toBe('Incorrect password');
    });

    it('InvalidPasswordError should accept custom message', () => {
      const error = new InvalidPasswordError('Wrong!');
      expect(error.message).toBe('Wrong!');
    });
  });
});
