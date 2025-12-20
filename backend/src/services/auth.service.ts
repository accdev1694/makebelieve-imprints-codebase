import { PrismaClient, UserType } from '@prisma/client';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
  TokenPayload,
} from '../utils/jwt';

const prisma = new PrismaClient();

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  type?: UserType;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    type: UserType;
  };
  tokens: AuthTokens;
}

/**
 * Register a new user
 * @param data - Registration data
 * @returns User and tokens
 * @throws Error if email already exists
 */
export async function register(data: RegisterData): Promise<AuthResult> {
  const { email, password, name, type = UserType.customer } = data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      type,
    },
  });

  // Generate tokens
  const tokens = await createTokensForUser(user.id, user.email, user.type);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      type: user.type,
    },
    tokens,
  };
}

/**
 * Login a user
 * @param data - Login credentials
 * @returns User and tokens
 * @throws Error if credentials are invalid
 */
export async function login(data: LoginData): Promise<AuthResult> {
  const { email, password } = data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const tokens = await createTokensForUser(user.id, user.email, user.type);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      type: user.type,
    },
    tokens,
  };
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - Current refresh token
 * @returns New tokens
 * @throws Error if refresh token is invalid or expired
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthTokens> {
  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Hash the refresh token for lookup
  const tokenHash = hashToken(refreshToken);

  // Find refresh token in database
  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      userId: decoded.userId,
      expiresAt: {
        gt: new Date(), // Not expired
      },
    },
    include: {
      user: true,
    },
  });

  if (!storedToken) {
    throw new Error('Invalid or expired refresh token');
  }

  // Delete old refresh token (rotation)
  await prisma.refreshToken.delete({
    where: { id: storedToken.id },
  });

  // Generate new tokens
  const tokens = await createTokensForUser(
    storedToken.user.id,
    storedToken.user.email,
    storedToken.user.type
  );

  return tokens;
}

/**
 * Logout user by invalidating refresh token
 * @param refreshToken - Refresh token to invalidate
 */
export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);

  // Delete refresh token from database
  await prisma.refreshToken.deleteMany({
    where: { tokenHash },
  });
}

/**
 * Logout user from all devices by invalidating all refresh tokens
 * @param userId - User ID
 */
export async function logoutAll(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
}

/**
 * Create tokens for a user and store refresh token in database
 * @param userId - User ID
 * @param email - User email
 * @param type - User type
 * @returns Access and refresh tokens
 */
async function createTokensForUser(
  userId: string,
  email: string,
  type: UserType
): Promise<AuthTokens> {
  const payload: TokenPayload = {
    userId,
    email,
    type,
  };

  // Generate tokens
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token in database (hashed)
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshTokenExpiry();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Hash a token for storage
 * @param token - Token to hash
 * @returns Hashed token
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Clean up expired refresh tokens (run periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
