import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '@mkbl/shared';

/**
 * Rate Limiting Middleware Configuration
 *
 * Protects API endpoints from abuse by limiting the number of requests
 * from a single IP address within a time window.
 *
 * Different rate limits are applied based on endpoint sensitivity:
 * - Auth endpoints: Stricter limits to prevent brute force attacks
 * - API endpoints: Standard limits for general API usage
 * - Public endpoints: More lenient limits for non-authenticated access
 */

/**
 * Standard error message for rate limit exceeded
 */
const rateLimitMessage = {
  success: false,
  error: 'Too many requests from this IP, please try again later.',
  retryAfter: 'Check the Retry-After header for wait time in seconds.',
};

/**
 * Global API rate limiter
 * Applies to all API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: RATE_LIMITS.GLOBAL.windowMinutes * 60 * 1000,
  max: RATE_LIMITS.GLOBAL.requests,
  message: rateLimitMessage,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip successful requests from counting against limit
  skipSuccessfulRequests: false,
  // Skip failed requests from counting against limit
  skipFailedRequests: false,
});

/**
 * Auth rate limiter (stricter)
 * Applies to login, register, password reset endpoints
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMinutes * 60 * 1000,
  max: RATE_LIMITS.AUTH.requests,
  message: {
    ...rateLimitMessage,
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Payment rate limiter (very strict)
 * Applies to payment processing endpoints
 * Prevents payment fraud and abuse
 */
export const paymentLimiter = rateLimit({
  windowMs: RATE_LIMITS.PAYMENT.windowMinutes * 60 * 1000,
  max: RATE_LIMITS.PAYMENT.requests,
  message: {
    ...rateLimitMessage,
    error: 'Too many payment attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful payments
});

/**
 * File upload rate limiter
 * Applies to file upload endpoints
 * Prevents storage abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: RATE_LIMITS.UPLOAD.windowMinutes * 60 * 1000,
  max: RATE_LIMITS.UPLOAD.requests,
  message: {
    ...rateLimitMessage,
    error: 'Too many file uploads, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Order creation rate limiter
 * Applies to order creation endpoint
 * Prevents order spam
 */
export const orderLimiter = rateLimit({
  windowMs: RATE_LIMITS.ORDER.windowMinutes * 60 * 1000,
  max: RATE_LIMITS.ORDER.requests,
  message: {
    ...rateLimitMessage,
    error: 'Too many orders created, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public read-only rate limiter
 * Applies to public endpoints (reviews, health checks, etc.)
 * More lenient for read-only operations
 */
export const publicLimiter = rateLimit({
  windowMs: RATE_LIMITS.PUBLIC.windowMinutes * 60 * 1000,
  max: RATE_LIMITS.PUBLIC.requests,
  message: rateLimitMessage,
  standardHeaders: true,
  legacyHeaders: false,
});
