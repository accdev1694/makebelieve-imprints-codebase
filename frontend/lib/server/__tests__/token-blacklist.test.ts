import {
  getTokenIdentifier,
  revokeToken,
  revokeAllUserTokens,
  isTokenRevoked,
  getBlacklistStats,
  clearBlacklist,
  stopCleanupTimer,
} from '../token-blacklist';

describe('Token Blacklist', () => {
  beforeEach(() => {
    clearBlacklist();
  });

  afterAll(() => {
    clearBlacklist();
    stopCleanupTimer();
  });

  describe('getTokenIdentifier', () => {
    it('should create consistent identifier from userId and iat', () => {
      const identifier = getTokenIdentifier('user-123', 1704067200);
      expect(identifier).toBe('user-123:1704067200');
    });

    it('should create different identifiers for different iat values', () => {
      const id1 = getTokenIdentifier('user-123', 1704067200);
      const id2 = getTokenIdentifier('user-123', 1704067201);
      expect(id1).not.toBe(id2);
    });
  });

  describe('revokeToken', () => {
    it('should add token to blacklist', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + 900; // 15 minutes from now

      revokeToken('user-123:1234567890', expiresAt, 'Test revocation');

      const stats = getBlacklistStats();
      expect(stats.size).toBe(1);
    });

    it('should not add already expired tokens', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredAt = now - 100; // Already expired

      revokeToken('user-123:1234567890', expiredAt);

      const stats = getBlacklistStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should create barrier entry for user', () => {
      revokeAllUserTokens('user-456', 900, 'Password changed');

      const stats = getBlacklistStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('isTokenRevoked', () => {
    it('should return false for non-revoked token', () => {
      const now = Math.floor(Date.now() / 1000);
      const isRevoked = isTokenRevoked('user-123', now);
      expect(isRevoked).toBe(false);
    });

    it('should return true for specifically revoked token', () => {
      const now = Math.floor(Date.now() / 1000);
      const iat = now - 60; // Issued 1 minute ago
      const expiresAt = now + 840; // Expires in 14 minutes

      const identifier = getTokenIdentifier('user-123', iat);
      revokeToken(identifier, expiresAt);

      const isRevoked = isTokenRevoked('user-123', iat);
      expect(isRevoked).toBe(true);
    });

    it('should return false for different token from same user', () => {
      const now = Math.floor(Date.now() / 1000);
      const iat1 = now - 60;
      const iat2 = now - 30;
      const expiresAt = now + 840;

      // Revoke first token only
      const identifier = getTokenIdentifier('user-123', iat1);
      revokeToken(identifier, expiresAt);

      // Second token should not be revoked
      const isRevoked = isTokenRevoked('user-123', iat2);
      expect(isRevoked).toBe(false);
    });

    it('should return true for tokens issued before revokeAllUserTokens', () => {
      const now = Math.floor(Date.now() / 1000);
      const oldIat = now - 300; // Token issued 5 minutes ago

      // Revoke all tokens for user
      revokeAllUserTokens('user-789', 900);

      // Old token should be revoked
      const isRevoked = isTokenRevoked('user-789', oldIat);
      expect(isRevoked).toBe(true);
    });

    it('should return false for tokens issued after revokeAllUserTokens', () => {
      const now = Math.floor(Date.now() / 1000);

      // Revoke all tokens for user
      revokeAllUserTokens('user-789', 900);

      // New token issued after revocation should be valid
      const newIat = now + 1;
      const isRevoked = isTokenRevoked('user-789', newIat);
      expect(isRevoked).toBe(false);
    });
  });

  describe('getBlacklistStats', () => {
    it('should return empty stats for empty blacklist', () => {
      const stats = getBlacklistStats();
      expect(stats.size).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });

    it('should track oldest and newest entries', () => {
      const now = Math.floor(Date.now() / 1000);

      revokeToken('token1', now + 100);
      revokeToken('token2', now + 500);
      revokeToken('token3', now + 300);

      const stats = getBlacklistStats();
      expect(stats.size).toBe(3);
      expect(stats.oldestEntry).toBe((now + 100) * 1000);
      expect(stats.newestEntry).toBe((now + 500) * 1000);
    });
  });

  describe('clearBlacklist', () => {
    it('should remove all entries', () => {
      const now = Math.floor(Date.now() / 1000);
      revokeToken('token1', now + 100);
      revokeToken('token2', now + 200);

      expect(getBlacklistStats().size).toBe(2);

      clearBlacklist();

      expect(getBlacklistStats().size).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle high volume of revocations', () => {
      const now = Math.floor(Date.now() / 1000);

      // Revoke 100 tokens
      for (let i = 0; i < 100; i++) {
        revokeToken(`user-${i}:${now - i}`, now + 900);
      }

      const stats = getBlacklistStats();
      expect(stats.size).toBe(100);

      // Check specific tokens are revoked
      expect(isTokenRevoked('user-50', now - 50)).toBe(true);
      expect(isTokenRevoked('user-999', now - 999)).toBe(false);
    });

    it('should handle concurrent user token revocations', () => {
      const now = Math.floor(Date.now() / 1000);

      // Revoke specific token
      revokeToken('user-123:1234567890', now + 900);

      // Then revoke all tokens
      revokeAllUserTokens('user-123', 900);

      // Both should be in blacklist
      const stats = getBlacklistStats();
      expect(stats.size).toBe(2);
    });
  });
});
