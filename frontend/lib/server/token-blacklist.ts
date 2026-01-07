/**
 * Token Blacklist Service
 *
 * Provides immediate token revocation capability.
 * Supports:
 * - Upstash Redis for distributed/serverless deployments
 * - Bounded in-memory fallback for development/single-instance
 *
 * Usage:
 *   import { getTokenBlacklist } from '@/lib/server/token-blacklist';
 *   const blacklist = getTokenBlacklist();
 *   await blacklist.revokeToken(identifier, expiresAt, 'logout');
 *   const isRevoked = await blacklist.isTokenRevoked(userId, iat);
 */

import { logger } from './logger';

interface BlacklistEntry {
  /** Token identifier (jti or userId+iat combo) */
  identifier: string;
  /** When the token would naturally expire (ms) */
  expiresAt: number;
  /** Reason for revocation */
  reason?: string;
}

// Memory bounds to prevent DoS (for in-memory implementation)
const MAX_ENTRIES = 10000;
const CLEANUP_THRESHOLD = 8000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TOKEN_LIFETIME_SECONDS = 15 * 60; // 15 minutes

/**
 * Abstract token blacklist interface
 */
export interface TokenBlacklist {
  revokeToken(identifier: string, expiresAt: number, reason?: string): Promise<void>;
  revokeAllUserTokens(userId: string, maxTokenLifetimeSeconds?: number, reason?: string): Promise<void>;
  isTokenRevoked(userId: string, iat: number): Promise<boolean>;
  getStats(): Promise<{ size: number; oldestEntry: number | null; newestEntry: number | null }>;
  clear(): Promise<void>;
}

/**
 * Generate a unique identifier for a token
 * Uses userId + issued-at timestamp as composite key
 */
export function getTokenIdentifier(userId: string, iat: number): string {
  return `${userId}:${iat}`;
}

/**
 * Bounded in-memory token blacklist
 * - Enforces maximum entry count to prevent memory exhaustion
 * - Auto-cleans expired entries
 * - Suitable for development and single-instance deployments
 */
class InMemoryTokenBlacklist implements TokenBlacklist {
  private store = new Map<string, BlacklistEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL_MS);

    // Don't prevent Node from exiting
    if (typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Token blacklist cleanup', { cleaned, remaining: this.store.size });
    }
  }

  async revokeToken(identifier: string, expiresAt: number, reason?: string): Promise<void> {
    // Convert seconds to milliseconds
    const expiresAtMs = expiresAt * 1000;

    // Only add if not already expired
    if (expiresAtMs <= Date.now()) return;

    // Cleanup if approaching limit
    if (this.store.size > CLEANUP_THRESHOLD) {
      this.cleanup();
    }

    // If still at limit, reject to prevent DoS
    if (this.store.size >= MAX_ENTRIES) {
      logger.warn('Token blacklist at capacity, cannot add new entry');
      return;
    }

    this.store.set(identifier, {
      identifier,
      expiresAt: expiresAtMs,
      reason,
    });

    logger.info('Token revoked', {
      identifier: identifier.substring(0, 20) + '...',
      reason: reason || 'no reason'
    });
  }

  async revokeAllUserTokens(
    userId: string,
    maxTokenLifetimeSeconds: number = DEFAULT_TOKEN_LIFETIME_SECONDS,
    reason?: string
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + maxTokenLifetimeSeconds;

    // Create a "barrier" entry that blocks any token issued before now
    await this.revokeToken(`all:${userId}`, expiresAt, reason || 'All tokens revoked');

    logger.info('All tokens revoked for user', { userId, reason: reason || 'no reason' });
  }

  async isTokenRevoked(userId: string, iat: number): Promise<boolean> {
    const now = Date.now();

    // Check for specific token revocation
    const identifier = getTokenIdentifier(userId, iat);
    const specificEntry = this.store.get(identifier);
    if (specificEntry && specificEntry.expiresAt > now) {
      return true;
    }

    // Check for "revoke all" entry for this user
    const allEntry = this.store.get(`all:${userId}`);
    if (allEntry && allEntry.expiresAt > now) {
      // Token is revoked if it was issued before the barrier was created
      const barrierCreatedAt = (allEntry.expiresAt / 1000) - DEFAULT_TOKEN_LIFETIME_SECONDS;
      if (iat < barrierCreatedAt) {
        return true;
      }
    }

    return false;
  }

  async getStats(): Promise<{ size: number; oldestEntry: number | null; newestEntry: number | null }> {
    if (this.store.size === 0) {
      return { size: 0, oldestEntry: null, newestEntry: null };
    }

    let oldest = Infinity;
    let newest = 0;

    for (const entry of this.store.values()) {
      if (entry.expiresAt < oldest) oldest = entry.expiresAt;
      if (entry.expiresAt > newest) newest = entry.expiresAt;
    }

    return {
      size: this.store.size,
      oldestEntry: oldest === Infinity ? null : oldest,
      newestEntry: newest === 0 ? null : newest,
    };
  }

  async clear(): Promise<void> {
    this.store.clear();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // For testing
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Upstash Redis token blacklist
 * - Distributed token revocation for serverless deployments
 * - Automatic TTL expiration
 * - Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
 */
class UpstashTokenBlacklist implements TokenBlacklist {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async redisCommand(command: (string | number)[]): Promise<unknown> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        logger.error('Upstash Redis command failed', new Error(`HTTP ${response.status}`));
        return null;
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      logger.error('Upstash Redis error', error);
      return null;
    }
  }

  async revokeToken(identifier: string, expiresAt: number, reason?: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = expiresAt - now;

    // Only add if not already expired
    if (ttl <= 0) return;

    const key = `tokenblacklist:${identifier}`;
    const value = JSON.stringify({ identifier, expiresAt: expiresAt * 1000, reason });

    // SET with EX (expiration in seconds)
    await this.redisCommand(['SET', key, value, 'EX', ttl]);

    logger.info('Token revoked (Redis)', {
      identifier: identifier.substring(0, 20) + '...',
      reason: reason || 'no reason',
      ttl
    });
  }

  async revokeAllUserTokens(
    userId: string,
    maxTokenLifetimeSeconds: number = DEFAULT_TOKEN_LIFETIME_SECONDS,
    reason?: string
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + maxTokenLifetimeSeconds;

    await this.revokeToken(`all:${userId}`, expiresAt, reason || 'All tokens revoked');

    logger.info('All tokens revoked for user (Redis)', { userId, reason: reason || 'no reason' });
  }

  async isTokenRevoked(userId: string, iat: number): Promise<boolean> {
    const now = Date.now();

    // Check for specific token revocation
    const identifier = getTokenIdentifier(userId, iat);
    const specificKey = `tokenblacklist:${identifier}`;
    const specificResult = await this.redisCommand(['GET', specificKey]);

    if (specificResult) {
      try {
        const entry = JSON.parse(specificResult as string) as BlacklistEntry;
        if (entry.expiresAt > now) {
          return true;
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Check for "revoke all" entry
    const allKey = `tokenblacklist:all:${userId}`;
    const allResult = await this.redisCommand(['GET', allKey]);

    if (allResult) {
      try {
        const entry = JSON.parse(allResult as string) as BlacklistEntry;
        if (entry.expiresAt > now) {
          const barrierCreatedAt = (entry.expiresAt / 1000) - DEFAULT_TOKEN_LIFETIME_SECONDS;
          if (iat < barrierCreatedAt) {
            return true;
          }
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    return false;
  }

  async getStats(): Promise<{ size: number; oldestEntry: number | null; newestEntry: number | null }> {
    // Use SCAN to count keys (approximate for large sets)
    const result = await this.redisCommand(['SCAN', '0', 'MATCH', 'tokenblacklist:*', 'COUNT', '1000']);

    if (!result || !Array.isArray(result)) {
      return { size: 0, oldestEntry: null, newestEntry: null };
    }

    const keys = result[1] as string[];
    return {
      size: keys.length,
      oldestEntry: null, // Would require fetching all entries
      newestEntry: null,
    };
  }

  async clear(): Promise<void> {
    // Scan and delete all tokenblacklist keys
    let cursor = '0';
    do {
      const result = await this.redisCommand(['SCAN', cursor, 'MATCH', 'tokenblacklist:*', 'COUNT', '100']);
      if (!result || !Array.isArray(result)) break;

      cursor = result[0] as string;
      const keys = result[1] as string[];

      if (keys.length > 0) {
        await this.redisCommand(['DEL', ...keys]);
      }
    } while (cursor !== '0');

    logger.info('Token blacklist cleared (Redis)');
  }
}

// Singleton instance
let tokenBlacklist: TokenBlacklist | null = null;

/**
 * Get the token blacklist instance
 * Uses Upstash Redis if configured, falls back to bounded in-memory
 */
export function getTokenBlacklist(): TokenBlacklist {
  if (tokenBlacklist) {
    return tokenBlacklist;
  }

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    logger.info('Token blacklist using Upstash Redis');
    tokenBlacklist = new UpstashTokenBlacklist(upstashUrl, upstashToken);
  } else {
    logger.info('Token blacklist using bounded in-memory store');
    tokenBlacklist = new InMemoryTokenBlacklist();
  }

  return tokenBlacklist;
}

/**
 * Create a fresh in-memory blacklist (for testing)
 */
export function createInMemoryBlacklist(): InMemoryTokenBlacklist {
  return new InMemoryTokenBlacklist();
}

/**
 * Reset the singleton (for testing)
 */
export function resetTokenBlacklist(): void {
  tokenBlacklist = null;
}

// Legacy exports for backward compatibility
// These use the singleton and are now async

/**
 * @deprecated Use getTokenBlacklist().revokeToken() instead
 */
export function revokeToken(identifier: string, expiresAt: number, reason?: string): void {
  getTokenBlacklist().revokeToken(identifier, expiresAt, reason);
}

/**
 * @deprecated Use getTokenBlacklist().revokeAllUserTokens() instead
 */
export function revokeAllUserTokens(
  userId: string,
  maxTokenLifetimeSeconds: number = DEFAULT_TOKEN_LIFETIME_SECONDS,
  reason?: string
): void {
  getTokenBlacklist().revokeAllUserTokens(userId, maxTokenLifetimeSeconds, reason);
}

/**
 * @deprecated Use getTokenBlacklist().isTokenRevoked() instead
 * Note: This synchronous version only works with in-memory blacklist
 */
export function isTokenRevoked(userId: string, iat: number): boolean {
  // For backward compatibility, check synchronously if using in-memory
  // This will NOT work correctly with Redis - callers should migrate to async version
  const blacklist = getTokenBlacklist();
  if (blacklist instanceof InMemoryTokenBlacklist) {
    // Access the sync check directly for backward compat
    const now = Date.now();
    const identifier = getTokenIdentifier(userId, iat);

    // @ts-expect-error - accessing private store for backward compat
    const store = blacklist.store as Map<string, BlacklistEntry>;

    const specificEntry = store.get(identifier);
    if (specificEntry && specificEntry.expiresAt > now) {
      return true;
    }

    const allEntry = store.get(`all:${userId}`);
    if (allEntry && allEntry.expiresAt > now) {
      const barrierCreatedAt = (allEntry.expiresAt / 1000) - DEFAULT_TOKEN_LIFETIME_SECONDS;
      if (iat < barrierCreatedAt) {
        return true;
      }
    }
    return false;
  }

  // For Redis, return false and log warning - caller must use async version
  logger.warn('isTokenRevoked sync called with Redis backend - use async isTokenRevoked instead');
  return false;
}

/**
 * @deprecated Use getTokenBlacklist().getStats() instead
 */
export function getBlacklistStats(): { size: number; oldestEntry: number | null; newestEntry: number | null } {
  const blacklist = getTokenBlacklist();
  if (blacklist instanceof InMemoryTokenBlacklist) {
    // @ts-expect-error - accessing private store for backward compat
    const store = blacklist.store as Map<string, BlacklistEntry>;

    if (store.size === 0) {
      return { size: 0, oldestEntry: null, newestEntry: null };
    }

    let oldest = Infinity;
    let newest = 0;

    for (const entry of store.values()) {
      if (entry.expiresAt < oldest) oldest = entry.expiresAt;
      if (entry.expiresAt > newest) newest = entry.expiresAt;
    }

    return {
      size: store.size,
      oldestEntry: oldest === Infinity ? null : oldest,
      newestEntry: newest === 0 ? null : newest,
    };
  }

  return { size: 0, oldestEntry: null, newestEntry: null };
}

/**
 * @deprecated Use getTokenBlacklist().clear() instead
 */
export function clearBlacklist(): void {
  getTokenBlacklist().clear();
}

/**
 * Stop cleanup timer (for testing with in-memory blacklist)
 */
export function stopCleanupTimer(): void {
  const blacklist = getTokenBlacklist();
  if (blacklist instanceof InMemoryTokenBlacklist) {
    blacklist.stopCleanupTimer();
  }
}
