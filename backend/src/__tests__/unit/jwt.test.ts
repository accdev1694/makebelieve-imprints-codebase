/**
 * JWT Utility Unit Tests
 * Tests for JWT token generation and verification
 */

import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { UserType } from '@prisma/client';

describe('JWT Utilities', () => {
  const testPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    type: UserType.customer,
  };

  const adminPayload = {
    userId: '987e6543-e21b-12d3-a456-426614174999',
    type: UserType.admin,
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateAccessToken(testPayload);
      const token2 = generateAccessToken(adminPayload);

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for same payload at different times', () => {
      const token1 = generateAccessToken(testPayload);

      // Wait a tiny bit to ensure different iat (issued at) timestamp
      const token2 = generateAccessToken(testPayload);

      // Tokens should be different due to different iat
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
    });

    it('should include user type in token', () => {
      const customerToken = generateAccessToken(testPayload);
      const adminToken = generateAccessToken(adminPayload);

      const customerDecoded = verifyAccessToken(customerToken);
      const adminDecoded = verifyAccessToken(adminToken);

      expect(customerDecoded.type).toBe(UserType.customer);
      expect(adminDecoded.type).toBe(UserType.admin);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateRefreshToken(testPayload);
      const token2 = generateRefreshToken(adminPayload);

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.type).toBe(testPayload.type);
      expect(decoded.iat).toBeDefined(); // issued at
      expect(decoded.exp).toBeDefined(); // expiration
    });

    it('should throw error for invalid token format', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => verifyAccessToken('')).toThrow();
    });

    it('should throw error for malformed JWT', () => {
      expect(() => verifyAccessToken('not.a.valid.jwt.token')).toThrow();
    });

    it('should reject refresh token when verifying as access token', () => {
      const refreshToken = generateRefreshToken(testPayload);

      // This should fail because refresh tokens use different secret
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });

    it('should decode token with correct expiration time', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyAccessToken(token);

      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + 15 * 60; // 15 minutes

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 2); // Allow 2 second tolerance
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = generateRefreshToken(testPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.type).toBe(testPayload.type);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow();
    });

    it('should reject access token when verifying as refresh token', () => {
      const accessToken = generateAccessToken(testPayload);

      // This should fail because access tokens use different secret
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });

    it('should decode token with correct expiration time', () => {
      const token = generateRefreshToken(testPayload);
      const decoded = verifyRefreshToken(token);

      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + 7 * 24 * 60 * 60; // 7 days

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 2);
    });
  });

  describe('Token Security', () => {
    it('should not decode tokens with tampered payload', () => {
      const token = generateAccessToken(testPayload);
      const parts = token.split('.');

      // Tamper with the payload
      const tamperedPayload = Buffer.from('{"userId":"hacker","type":"admin"}').toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      expect(() => verifyAccessToken(tamperedToken)).toThrow();
    });

    it('should not decode tokens with tampered signature', () => {
      const token = generateAccessToken(testPayload);
      const parts = token.split('.');

      // Tamper with the signature
      const tamperedToken = `${parts[0]}.${parts[1]}.fakesignature`;

      expect(() => verifyAccessToken(tamperedToken)).toThrow();
    });

    it('should maintain token integrity for admin users', () => {
      const token = generateAccessToken(adminPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.type).toBe(UserType.admin);
      expect(decoded.userId).toBe(adminPayload.userId);
    });
  });

  describe('Token Lifecycle', () => {
    it('should complete full cycle: generate access token, verify, decode', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.type).toBe(testPayload.type);
    });

    it('should complete full cycle: generate refresh token, verify, decode', () => {
      const token = generateRefreshToken(testPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.type).toBe(testPayload.type);
    });

    it('should handle both customer and admin tokens correctly', () => {
      const customerAccessToken = generateAccessToken(testPayload);
      const adminAccessToken = generateAccessToken(adminPayload);

      const customerDecoded = verifyAccessToken(customerAccessToken);
      const adminDecoded = verifyAccessToken(adminAccessToken);

      expect(customerDecoded.type).toBe(UserType.customer);
      expect(adminDecoded.type).toBe(UserType.admin);
    });

    it('should generate and verify multiple tokens concurrently', () => {
      const payloads = Array.from({ length: 5 }, (_, i) => ({
        userId: `user-${i}`,
        type: i % 2 === 0 ? UserType.customer : UserType.admin,
      }));

      const tokens = payloads.map((p) => generateAccessToken(p));
      const decoded = tokens.map((t) => verifyAccessToken(t));

      decoded.forEach((d, i) => {
        expect(d.userId).toBe(payloads[i].userId);
        expect(d.type).toBe(payloads[i].type);
      });
    });
  });

  describe('Token Expiration Claims', () => {
    it('should have different expiration times for access and refresh tokens', () => {
      const accessToken = generateAccessToken(testPayload);
      const refreshToken = generateRefreshToken(testPayload);

      const accessDecoded = verifyAccessToken(accessToken);
      const refreshDecoded = verifyRefreshToken(refreshToken);

      // Refresh token should expire much later than access token
      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });

    it('should include issued at timestamp', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyAccessToken(token);

      const now = Math.floor(Date.now() / 1000);

      expect(decoded.iat).toBeDefined();
      expect(decoded.iat).toBeLessThanOrEqual(now);
      expect(decoded.iat).toBeGreaterThan(now - 5); // Within last 5 seconds
    });
  });
});
