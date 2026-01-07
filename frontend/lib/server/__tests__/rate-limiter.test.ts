import {
  createRateLimiter,
  getRateLimiter,
  resetRateLimiter,
  DEFAULT_RATE_LIMITS,
  RateLimiter,
} from '../rate-limiter';

// Mock logger to reduce noise
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Rate Limiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    resetRateLimiter();
    limiter = createRateLimiter();
  });

  describe('DEFAULT_RATE_LIMITS', () => {
    it('should have rate limits for auth endpoints', () => {
      expect(DEFAULT_RATE_LIMITS['/api/auth/login']).toBeDefined();
      expect(DEFAULT_RATE_LIMITS['/api/auth/register']).toBeDefined();
      expect(DEFAULT_RATE_LIMITS['/api/auth/forgot-password']).toBeDefined();
      expect(DEFAULT_RATE_LIMITS['/api/auth/reset-password']).toBeDefined();
    });

    it('should have rate limits for public endpoints', () => {
      expect(DEFAULT_RATE_LIMITS['/api/subscribers']).toBeDefined();
      expect(DEFAULT_RATE_LIMITS['/api/contact']).toBeDefined();
    });

    it('login should allow 5 requests per 15 minutes', () => {
      expect(DEFAULT_RATE_LIMITS['/api/auth/login'].maxRequests).toBe(5);
      expect(DEFAULT_RATE_LIMITS['/api/auth/login'].windowMs).toBe(15 * 60 * 1000);
    });

    it('register should allow 3 requests per hour', () => {
      expect(DEFAULT_RATE_LIMITS['/api/auth/register'].maxRequests).toBe(3);
      expect(DEFAULT_RATE_LIMITS['/api/auth/register'].windowMs).toBe(60 * 60 * 1000);
    });
  });

  describe('InMemoryRateLimiter', () => {
    describe('check', () => {
      it('should allow requests for unconfigured paths', async () => {
        const result = await limiter.check('192.168.1.1', '/api/products');

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(Infinity);
      });

      it('should allow first request for configured path', async () => {
        const result = await limiter.check('192.168.1.1', '/api/auth/login');

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4); // 5 max - 1 used
      });

      it('should track remaining requests correctly', async () => {
        await limiter.check('192.168.1.1', '/api/auth/login');
        await limiter.check('192.168.1.1', '/api/auth/login');
        const result = await limiter.check('192.168.1.1', '/api/auth/login');

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2); // 5 max - 3 used
      });

      it('should block after exceeding limit', async () => {
        // Use up all 5 login attempts
        for (let i = 0; i < 5; i++) {
          await limiter.check('192.168.1.1', '/api/auth/login');
        }

        const result = await limiter.check('192.168.1.1', '/api/auth/login');

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.retryAfter).toBeGreaterThan(0);
      });

      it('should track different IPs separately', async () => {
        // Exhaust limit for IP 1
        for (let i = 0; i < 5; i++) {
          await limiter.check('192.168.1.1', '/api/auth/login');
        }

        // IP 2 should still be allowed
        const result = await limiter.check('192.168.1.2', '/api/auth/login');

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
      });

      it('should track different paths separately', async () => {
        // Exhaust login limit
        for (let i = 0; i < 5; i++) {
          await limiter.check('192.168.1.1', '/api/auth/login');
        }

        // Contact endpoint should still be allowed
        const result = await limiter.check('192.168.1.1', '/api/contact');

        expect(result.allowed).toBe(true);
      });

      it('should match paths by prefix', async () => {
        const result = await limiter.check('192.168.1.1', '/api/auth/login/oauth');

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4); // Matched login endpoint
      });

      it('should return resetTime', async () => {
        const before = Date.now();
        const result = await limiter.check('192.168.1.1', '/api/auth/login');
        const after = Date.now();

        expect(result.resetTime).toBeGreaterThan(before);
        expect(result.resetTime).toBeLessThanOrEqual(after + 15 * 60 * 1000);
      });
    });

    describe('reset', () => {
      it('should reset rate limit for specific identifier', async () => {
        // Use up all attempts
        for (let i = 0; i < 5; i++) {
          await limiter.check('192.168.1.1', '/api/auth/login');
        }

        // Should be blocked
        let result = await limiter.check('192.168.1.1', '/api/auth/login');
        expect(result.allowed).toBe(false);

        // Reset
        await limiter.reset('192.168.1.1', '/api/auth/login');

        // Should be allowed again
        result = await limiter.check('192.168.1.1', '/api/auth/login');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
      });
    });

    describe('custom config', () => {
      it('should use custom rate limits when provided', async () => {
        const customLimiter = createRateLimiter({
          '/api/custom': { maxRequests: 2, windowMs: 1000 },
        });

        await customLimiter.check('192.168.1.1', '/api/custom');
        const result = await customLimiter.check('192.168.1.1', '/api/custom');

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(0);

        // Third request should be blocked
        const blocked = await customLimiter.check('192.168.1.1', '/api/custom');
        expect(blocked.allowed).toBe(false);
      });
    });
  });

  describe('getRateLimiter', () => {
    beforeEach(() => {
      resetRateLimiter();
      // Clear env vars
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });

    afterEach(() => {
      resetRateLimiter();
    });

    it('should return in-memory limiter when Upstash not configured', () => {
      const limiter = getRateLimiter();
      expect(limiter).toBeDefined();
    });

    it('should return singleton instance', () => {
      const limiter1 = getRateLimiter();
      const limiter2 = getRateLimiter();
      expect(limiter1).toBe(limiter2);
    });

    it('should return new instance with custom config', () => {
      const limiter1 = getRateLimiter();
      const limiter2 = getRateLimiter({ '/custom': { maxRequests: 1, windowMs: 1000 } });

      // Custom config creates new instance
      expect(limiter1).not.toBe(limiter2);
    });
  });

  describe('Edge cases', () => {
    it('should handle high volume of different IPs', async () => {
      for (let i = 0; i < 100; i++) {
        const result = await limiter.check(`192.168.1.${i}`, '/api/auth/login');
        expect(result.allowed).toBe(true);
      }
    });

    it('should handle rapid requests from same IP', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(limiter.check('192.168.1.1', '/api/auth/login'));
      }

      const results = await Promise.all(promises);
      const allowed = results.filter((r) => r.allowed).length;
      const blocked = results.filter((r) => !r.allowed).length;

      // Should allow exactly 5
      expect(allowed).toBe(5);
      expect(blocked).toBe(5);
    });

    it('should handle empty IP', async () => {
      const result = await limiter.check('', '/api/auth/login');
      expect(result.allowed).toBe(true);
    });

    it('should handle IPv6 addresses', async () => {
      const result = await limiter.check('2001:0db8:85a3:0000:0000:8a2e:0370:7334', '/api/auth/login');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe('Window expiration', () => {
    it('should reset count after window expires', async () => {
      // Create limiter with 100ms window
      const shortLimiter = createRateLimiter({
        '/api/test': { maxRequests: 2, windowMs: 100 },
      });

      // Use up all requests
      await shortLimiter.check('192.168.1.1', '/api/test');
      await shortLimiter.check('192.168.1.1', '/api/test');

      // Should be blocked
      let result = await shortLimiter.check('192.168.1.1', '/api/test');
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      result = await shortLimiter.check('192.168.1.1', '/api/test');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });
});

describe('Rate Limiter - Upstash Redis', () => {
  let originalFetch: typeof global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    originalFetch = global.fetch;
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    resetRateLimiter();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    resetRateLimiter();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('should use Upstash when env vars are set', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const instance = getRateLimiter();
    expect(instance).toBeDefined();
  });

  it('should allow requests for unconfigured paths', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const instance = getRateLimiter();
    const result = await instance.check('192.168.1.1', '/api/products');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(Infinity);
  });

  it('should call Redis pipeline on check for configured path', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    // Mock pipeline response: [removedCount, currentCount, addedCount, expireResult]
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { result: 0 },      // ZREMRANGEBYSCORE
        { result: 1 },      // ZCARD (count before our add)
        { result: 1 },      // ZADD
        { result: 1 },      // EXPIRE
      ]),
    });

    const instance = getRateLimiter();
    const result = await instance.check('192.168.1.1', '/api/auth/login');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.upstash.io/pipeline',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
    expect(result.allowed).toBe(true);
  });

  it('should block when over limit', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    // Mock: count is already at max (5)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { result: 0 },
          { result: 5 },  // At limit
          { result: 1 },
          { result: 1 },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 1 }), // Remove latest entry
      });

    const instance = getRateLimiter();
    const result = await instance.check('192.168.1.1', '/api/auth/login');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should fail open when Redis returns error', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const instance = getRateLimiter();
    const result = await instance.check('192.168.1.1', '/api/auth/login');

    // Should fail open - allow request
    expect(result.allowed).toBe(true);
  });

  it('should fail open when fetch throws', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockFetch.mockRejectedValue(new Error('Network error'));

    const instance = getRateLimiter();
    const result = await instance.check('192.168.1.1', '/api/auth/login');

    // Should fail open - allow request
    expect(result.allowed).toBe(true);
  });

  it('should call DEL on reset', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 1 }),
    });

    const instance = getRateLimiter();
    await instance.reset('192.168.1.1', '/api/auth/login');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.upstash.io',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('DEL'),
      })
    );
  });

  it('should handle reset errors gracefully', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockFetch.mockRejectedValue(new Error('Network error'));

    const instance = getRateLimiter();

    // Should not throw
    await expect(instance.reset('192.168.1.1', '/api/auth/login')).resolves.toBeUndefined();
  });

  it('should handle custom config with Upstash', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { result: 0 },
        { result: 0 },
        { result: 1 },
        { result: 1 },
      ]),
    });

    const instance = getRateLimiter({ '/api/custom': { maxRequests: 10, windowMs: 60000 } });
    const result = await instance.check('192.168.1.1', '/api/custom');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9); // 10 - 0 - 1
  });
});
