/**
 * Token Blacklist Service
 *
 * Provides immediate token revocation capability.
 * In production, this should be backed by Redis for distributed deployment.
 *
 * Current implementation uses in-memory Map (suitable for single-instance deployment).
 * Tokens are auto-cleaned when they would have expired anyway.
 */

interface BlacklistEntry {
  /** Token identifier (jti or userId+iat combo) */
  identifier: string;
  /** When the token would naturally expire */
  expiresAt: number;
  /** Reason for revocation */
  reason?: string;
}

// In-memory blacklist - upgrade to Redis for production multi-instance
const blacklist = new Map<string, BlacklistEntry>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start the cleanup timer to remove expired entries
 */
function startCleanupTimer() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of blacklist.entries()) {
      if (entry.expiresAt < now) {
        blacklist.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Token Blacklist] Cleaned ${cleaned} expired entries`);
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent Node from exiting (if available, e.g., in Node.js)
  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }
}

/**
 * Stop the cleanup timer (for testing)
 */
export function stopCleanupTimer() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Generate a unique identifier for a token
 * Uses userId + issued-at timestamp as composite key
 */
export function getTokenIdentifier(userId: string, iat: number): string {
  return `${userId}:${iat}`;
}

/**
 * Revoke a specific token
 *
 * @param identifier - Token identifier (from getTokenIdentifier)
 * @param expiresAt - When the token would naturally expire (Unix timestamp in seconds)
 * @param reason - Optional reason for revocation
 */
export function revokeToken(
  identifier: string,
  expiresAt: number,
  reason?: string
): void {
  // Start cleanup timer if not already running
  startCleanupTimer();

  // Convert seconds to milliseconds for storage
  const expiresAtMs = expiresAt * 1000;

  // Only add if not already expired
  if (expiresAtMs > Date.now()) {
    blacklist.set(identifier, {
      identifier,
      expiresAt: expiresAtMs,
      reason,
    });
    console.log(`[Token Blacklist] Revoked token: ${identifier.substring(0, 20)}... (${reason || 'no reason'})`);
  }
}

/**
 * Revoke all tokens for a user (logout all devices)
 * Since we don't track all issued tokens, this adds an entry that blocks
 * any token issued before the current time.
 *
 * @param userId - User ID to revoke all tokens for
 * @param maxTokenLifetimeSeconds - Maximum lifetime of tokens (default 15 minutes for access tokens)
 * @param reason - Reason for revocation
 */
export function revokeAllUserTokens(
  userId: string,
  maxTokenLifetimeSeconds: number = 15 * 60,
  reason?: string
): void {
  startCleanupTimer();

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + maxTokenLifetimeSeconds;

  // Create a "barrier" entry that blocks any token issued before now
  // This uses a special identifier format that isTokenRevoked will check
  blacklist.set(`all:${userId}`, {
    identifier: `all:${userId}`,
    expiresAt: expiresAt * 1000, // Convert to ms
    reason: reason || 'All tokens revoked',
  });

  console.log(`[Token Blacklist] Revoked ALL tokens for user ${userId} (${reason || 'no reason'})`);
}

/**
 * Check if a token has been revoked
 *
 * @param userId - User ID from the token
 * @param iat - Token issued-at timestamp (Unix seconds)
 * @returns true if token is revoked, false if valid
 */
export function isTokenRevoked(userId: string, iat: number): boolean {
  const now = Date.now();

  // Check for specific token revocation
  const identifier = getTokenIdentifier(userId, iat);
  const specificEntry = blacklist.get(identifier);
  if (specificEntry && specificEntry.expiresAt > now) {
    return true;
  }

  // Check for "revoke all" entry for this user
  const allEntry = blacklist.get(`all:${userId}`);
  if (allEntry && allEntry.expiresAt > now) {
    // Token is revoked if it was issued before the barrier was created
    // The barrier's expiry time minus max token lifetime gives us the cutoff
    const barrierCreatedAt = (allEntry.expiresAt / 1000) - (15 * 60); // Assuming 15 min tokens
    if (iat < barrierCreatedAt) {
      return true;
    }
  }

  return false;
}

/**
 * Get blacklist statistics (for monitoring)
 */
export function getBlacklistStats(): {
  size: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  if (blacklist.size === 0) {
    return { size: 0, oldestEntry: null, newestEntry: null };
  }

  let oldest = Infinity;
  let newest = 0;

  for (const entry of blacklist.values()) {
    if (entry.expiresAt < oldest) oldest = entry.expiresAt;
    if (entry.expiresAt > newest) newest = entry.expiresAt;
  }

  return {
    size: blacklist.size,
    oldestEntry: oldest === Infinity ? null : oldest,
    newestEntry: newest === 0 ? null : newest,
  };
}

/**
 * Clear the blacklist (for testing)
 */
export function clearBlacklist(): void {
  blacklist.clear();
  stopCleanupTimer();
}
