import jwt from 'jsonwebtoken';

/**
 * JWT token utilities for authentication
 * Access tokens: 15 minutes (short-lived, httpOnly cookies)
 * Refresh tokens: 7 days (long-lived, stored in database)
 */

// Token configuration
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';
// Use seconds for token expiry (15 minutes = 900s, 7 days = 604800s)
const ACCESS_TOKEN_EXPIRY = 900; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 604800; // 7 days in seconds

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'customer' | 'admin';
}

export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

/**
 * Generate an access token
 * @param payload - User information to encode
 * @returns JWT access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate a refresh token
 * @param payload - User information to encode
 * @returns JWT refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify and decode an access token
 * @param token - JWT access token
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export function verifyAccessToken(token: string): DecodedToken {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as DecodedToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify and decode a refresh token
 * @param token - JWT refresh token
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export function verifyRefreshToken(token: string): DecodedToken {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as DecodedToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Calculate refresh token expiry date
 * @returns Date object representing when refresh token expires
 */
export function getRefreshTokenExpiry(): Date {
  // REFRESH_TOKEN_EXPIRY is in seconds, convert to milliseconds
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000);
}
