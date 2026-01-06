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
import { sendPasswordResetEmail } from './email';
import { validatePassword } from './validation';
import { revokeAllUserTokens } from './token-blacklist';

// Custom error classes for distinct login errors
export class UserNotFoundError extends Error {
  code = 'USER_NOT_FOUND';
  constructor(message = 'No account found with this email') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class InvalidPasswordError extends Error {
  code = 'INVALID_PASSWORD';
  constructor(message = 'Incorrect password') {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

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
    throw new UserNotFoundError();
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw new InvalidPasswordError();
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

/**
 * Generate a secure random token
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Request password reset - generates token and sends email
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Always return success to prevent email enumeration attacks
  // But only send email if user exists
  if (!user) {
    return {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    };
  }

  // Generate reset token
  const resetToken = generateResetToken();
  const tokenHash = hashToken(resetToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  // Delete any existing reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Store reset token in database
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  // Send password reset email
  await sendPasswordResetEmail(user.email, user.name, resetToken);

  return {
    success: true,
    message: 'If an account exists with this email, you will receive a password reset link.',
  };
}

/**
 * Reset password using token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  // Validate password meets complexity requirements
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors.join('. '));
  }

  // Hash the provided token
  const tokenHash = hashToken(token);

  // Find valid reset token
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });

  if (!resetToken) {
    throw new Error('Invalid or expired reset token');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user password and mark token as used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
    // Invalidate all refresh tokens for security
    prisma.refreshToken.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  // Immediately revoke all access tokens for this user
  // This ensures any active sessions are terminated instantly
  revokeAllUserTokens(resetToken.userId, 15 * 60, 'Password reset');

  return {
    success: true,
    message: 'Password has been reset successfully. You can now log in with your new password.',
  };
}
