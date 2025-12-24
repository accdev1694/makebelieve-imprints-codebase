import { UserType } from '@prisma/client';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword } from './password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
  TokenPayload,
} from './jwt';

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
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
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
        gt: new Date(),
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
 */
export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.deleteMany({
    where: { tokenHash },
  });
}

/**
 * Create tokens for a user and store refresh token in database
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

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

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
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
