import {
  getTokenIdentifier,
  revokeToken,
  revokeAllUserTokens,
  isTokenRevoked,
  getBlacklistStats,
  clearBlacklist,
  stopCleanupTimer,
  getTokenBlacklist,
  createInMemoryBlacklist,
  resetTokenBlacklist,
  TokenBlacklist,
} from '../token-blacklist';

// Mock logger to reduce noise
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Token Blacklist', () => {
  beforeEach(() => {
    resetTokenBlacklist();
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

  describe('revokeToken (legacy sync)', () => {
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

  describe('revokeAllUserTokens (legacy sync)', () => {
    it('should create barrier entry for user', () => {
      revokeAllUserTokens('user-456', 900, 'Password changed');

      const stats = getBlacklistStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('isTokenRevoked (legacy sync)', () => {
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

  describe('getBlacklistStats (legacy sync)', () => {
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

  describe('clearBlacklist (legacy sync)', () => {
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

describe('Token Blacklist - Async Interface', () => {
  let blacklist: TokenBlacklist;

  beforeEach(() => {
    blacklist = createInMemoryBlacklist();
  });

  afterEach(async () => {
    await blacklist.clear();
  });

  describe('revokeToken', () => {
    it('should add token to blacklist asynchronously', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + 900;

      await blacklist.revokeToken('user-123:12345', expiresAt, 'Test');

      const stats = await blacklist.getStats();
      expect(stats.size).toBe(1);
    });

    it('should skip expired tokens', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredAt = now - 100;

      await blacklist.revokeToken('user-123:12345', expiredAt);

      const stats = await blacklist.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for user', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oldIat = now - 300;

      await blacklist.revokeAllUserTokens('user-456', 900, 'Logout all');

      const isRevoked = await blacklist.isTokenRevoked('user-456', oldIat);
      expect(isRevoked).toBe(true);
    });

    it('should allow new tokens after revocation', async () => {
      const now = Math.floor(Date.now() / 1000);

      await blacklist.revokeAllUserTokens('user-456', 900);

      // New token issued after revocation
      const newIat = now + 10;
      const isRevoked = await blacklist.isTokenRevoked('user-456', newIat);
      expect(isRevoked).toBe(false);
    });
  });

  describe('isTokenRevoked', () => {
    it('should return false for valid token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const isRevoked = await blacklist.isTokenRevoked('user-123', now);
      expect(isRevoked).toBe(false);
    });

    it('should return true for revoked token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const iat = now - 60;
      const expiresAt = now + 840;

      const identifier = getTokenIdentifier('user-123', iat);
      await blacklist.revokeToken(identifier, expiresAt);

      const isRevoked = await blacklist.isTokenRevoked('user-123', iat);
      expect(isRevoked).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return stats asynchronously', async () => {
      const stats = await blacklist.getStats();
      expect(stats.size).toBe(0);
      expect(stats.oldestEntry).toBeNull();
    });

    it('should track multiple entries', async () => {
      const now = Math.floor(Date.now() / 1000);

      await blacklist.revokeToken('t1', now + 100);
      await blacklist.revokeToken('t2', now + 200);
      await blacklist.revokeToken('t3', now + 150);

      const stats = await blacklist.getStats();
      expect(stats.size).toBe(3);
      expect(stats.oldestEntry).toBe((now + 100) * 1000);
      expect(stats.newestEntry).toBe((now + 200) * 1000);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      const now = Math.floor(Date.now() / 1000);

      await blacklist.revokeToken('t1', now + 100);
      await blacklist.revokeToken('t2', now + 200);

      let stats = await blacklist.getStats();
      expect(stats.size).toBe(2);

      await blacklist.clear();

      stats = await blacklist.getStats();
      expect(stats.size).toBe(0);
    });
  });
});

describe('Token Blacklist - Singleton', () => {
  beforeEach(() => {
    resetTokenBlacklist();
  });

  afterEach(() => {
    resetTokenBlacklist();
  });

  it('should return same instance on multiple calls', () => {
    const instance1 = getTokenBlacklist();
    const instance2 = getTokenBlacklist();
    expect(instance1).toBe(instance2);
  });

  it('should create new instance after reset', () => {
    const instance1 = getTokenBlacklist();
    resetTokenBlacklist();
    const instance2 = getTokenBlacklist();
    expect(instance1).not.toBe(instance2);
  });

  it('should use in-memory by default (no env vars)', () => {
    const instance = getTokenBlacklist();
    expect(instance).toBeDefined();
  });
});

describe('Token Blacklist - Upstash Redis', () => {
  let originalFetch: typeof global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    originalFetch = global.fetch;
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    resetTokenBlacklist();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('should use Upstash when env vars are set', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const instance = getTokenBlacklist();
    expect(instance).toBeDefined();
  });

  it('should call Redis SET on revokeToken', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 'OK' }),
    });

    const instance = getTokenBlacklist();
    const now = Math.floor(Date.now() / 1000);
    await instance.revokeToken('test-id', now + 900, 'test');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.upstash.io',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('should call Redis GET on isTokenRevoked', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: null }),
    });

    const instance = getTokenBlacklist();
    const now = Math.floor(Date.now() / 1000);
    const isRevoked = await instance.isTokenRevoked('user-123', now);

    expect(isRevoked).toBe(false);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('should return true when token is found in Redis', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const now = Date.now();
    const iat = Math.floor(now / 1000) - 60;

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: JSON.stringify({
          identifier: getTokenIdentifier('user-123', iat),
          expiresAt: now + 900000, // 15 min from now in ms
          reason: 'test',
        }),
      }),
    });

    const instance = getTokenBlacklist();
    const isRevoked = await instance.isTokenRevoked('user-123', iat);

    expect(isRevoked).toBe(true);
  });

  it('should handle Redis errors gracefully', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const instance = getTokenBlacklist();
    const now = Math.floor(Date.now() / 1000);

    // Should not throw
    const isRevoked = await instance.isTokenRevoked('user-123', now);
    expect(isRevoked).toBe(false);
  });

  it('should handle network errors gracefully', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockFetch.mockRejectedValue(new Error('Network error'));

    const instance = getTokenBlacklist();
    const now = Math.floor(Date.now() / 1000);

    // Should not throw
    const isRevoked = await instance.isTokenRevoked('user-123', now);
    expect(isRevoked).toBe(false);
  });

  it('should call SCAN and DEL on clear', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    // First call: SCAN returns keys
    // Second call: DEL
    // Third call: SCAN returns empty (cursor 0)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: ['0', ['tokenblacklist:test1']] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 1 }),
      });

    const instance = getTokenBlacklist();
    await instance.clear();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
