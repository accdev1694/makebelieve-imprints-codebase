/**
 * Rate Limiter Service
 *
 * Production-ready rate limiting with:
 * - Upstash Redis support for distributed/serverless deployments
 * - Bounded in-memory fallback for development/single-instance
 * - Configurable limits per endpoint pattern
 * - Automatic cleanup of expired entries
 *
 * Usage:
 *   const limiter = getRateLimiter();
 *   const result = await limiter.check(ip, '/api/auth/login');
 *   if (!result.allowed) return 429 response
 */

import { logger } from './logger';

// Rate limit configuration
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Default rate limits per endpoint pattern
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth/login': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  '/api/auth/register': { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  '/api/auth/forgot-password': { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  '/api/auth/reset-password': { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  '/api/subscribers': { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  '/api/contact': { maxRequests: 3, windowMs: 60 * 1000 }, // 3 per minute
};

// Memory bounds to prevent DoS
const MAX_ENTRIES = 10000;
const CLEANUP_THRESHOLD = 8000;

/**
 * Abstract rate limiter interface
 */
export interface RateLimiter {
  check(identifier: string, pattern: string): Promise<RateLimitResult>;
  reset(identifier: string, pattern: string): Promise<void>;
}

/**
 * Bounded in-memory rate limiter
 * - Enforces maximum entry count to prevent memory exhaustion
 * - Auto-cleans expired entries
 * - Suitable for development and single-instance deployments
 */
class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private config: Record<string, RateLimitConfig>;

  constructor(config: Record<string, RateLimitConfig> = DEFAULT_RATE_LIMITS) {
    this.config = config;
  }

  async check(identifier: string, pathname: string): Promise<RateLimitResult> {
    // Find matching rate limit config
    const configEntry = Object.entries(this.config).find(([pattern]) =>
      pathname.startsWith(pattern)
    );

    if (!configEntry) {
      return { allowed: true, remaining: Infinity, resetTime: 0 };
    }

    const [pattern, { maxRequests, windowMs }] = configEntry;
    const key = `${identifier}:${pattern}`;
    const now = Date.now();

    // Cleanup if approaching limit
    if (this.store.size > CLEANUP_THRESHOLD) {
      this.cleanup();
    }

    // If still at limit after cleanup, reject to prevent DoS
    if (this.store.size >= MAX_ENTRIES) {
      logger.warn('RateLimiter store at capacity, rejecting new entries');
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + 60000,
        retryAfter: 60,
      };
    }

    const record = this.store.get(key);

    // New window or expired
    if (!record || now > record.resetTime) {
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    // Check if over limit
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter,
      };
    }

    // Increment counter
    record.count++;
    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  async reset(identifier: string, pattern: string): Promise<void> {
    const key = `${identifier}:${pattern}`;
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('RateLimiter cleanup', { cleaned, remaining: this.store.size });
    }
  }

  // For testing
  getStoreSize(): number {
    return this.store.size;
  }

  clearStore(): void {
    this.store.clear();
  }
}

/**
 * Upstash Redis rate limiter
 * - Distributed rate limiting for serverless deployments
 * - Uses sliding window algorithm
 * - Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
 */
class UpstashRateLimiter implements RateLimiter {
  private baseUrl: string;
  private token: string;
  private config: Record<string, RateLimitConfig>;

  constructor(
    baseUrl: string,
    token: string,
    config: Record<string, RateLimitConfig> = DEFAULT_RATE_LIMITS
  ) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.config = config;
  }

  async check(identifier: string, pathname: string): Promise<RateLimitResult> {
    const configEntry = Object.entries(this.config).find(([pattern]) =>
      pathname.startsWith(pattern)
    );

    if (!configEntry) {
      return { allowed: true, remaining: Infinity, resetTime: 0 };
    }

    const [pattern, { maxRequests, windowMs }] = configEntry;
    const key = `ratelimit:${identifier}:${pattern}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Use Redis sorted set for sliding window
      // Remove old entries and count current window
      const pipeline = [
        ['ZREMRANGEBYSCORE', key, '0', String(windowStart)],
        ['ZCARD', key],
        ['ZADD', key, String(now), `${now}-${Math.random()}`],
        ['EXPIRE', key, String(Math.ceil(windowMs / 1000))],
      ];

      const response = await fetch(`${this.baseUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipeline),
      });

      if (!response.ok) {
        logger.error('RateLimiter Upstash error', new Error(`HTTP ${response.status}`));
        // Fail open - allow request if Redis is down
        return { allowed: true, remaining: maxRequests, resetTime: now + windowMs };
      }

      const results = await response.json();
      const currentCount = results[1].result as number;

      if (currentCount >= maxRequests) {
        // Over limit - remove the entry we just added
        await this.removeLatestEntry(key, now);

        return {
          allowed: false,
          remaining: 0,
          resetTime: now + windowMs,
          retryAfter: Math.ceil(windowMs / 1000),
        };
      }

      return {
        allowed: true,
        remaining: maxRequests - currentCount - 1,
        resetTime: now + windowMs,
      };
    } catch (error) {
      logger.error('RateLimiter Upstash error', error);
      // Fail open
      return { allowed: true, remaining: maxRequests, resetTime: now + windowMs };
    }
  }

  private async removeLatestEntry(key: string, timestamp: number): Promise<void> {
    try {
      await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['ZREMRANGEBYSCORE', key, String(timestamp), String(timestamp + 1)]),
      });
    } catch {
      // Ignore cleanup errors
    }
  }

  async reset(identifier: string, pattern: string): Promise<void> {
    const key = `ratelimit:${identifier}:${pattern}`;
    try {
      await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['DEL', key]),
      });
    } catch (error) {
      logger.error('RateLimiter failed to reset', error);
    }
  }
}

// Singleton instance
let rateLimiter: RateLimiter | null = null;

/**
 * Get the rate limiter instance
 * Uses Upstash Redis if configured, falls back to bounded in-memory
 */
export function getRateLimiter(config?: Record<string, RateLimitConfig>): RateLimiter {
  if (rateLimiter && !config) {
    return rateLimiter;
  }

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    logger.info('RateLimiter using Upstash Redis');
    rateLimiter = new UpstashRateLimiter(upstashUrl, upstashToken, config);
  } else {
    logger.info('RateLimiter using bounded in-memory store');
    rateLimiter = new InMemoryRateLimiter(config);
  }

  return rateLimiter;
}

/**
 * Create a fresh rate limiter (for testing)
 */
export function createRateLimiter(config?: Record<string, RateLimitConfig>): RateLimiter {
  return new InMemoryRateLimiter(config);
}

/**
 * Reset the singleton (for testing)
 */
export function resetRateLimiter(): void {
  rateLimiter = null;
}
