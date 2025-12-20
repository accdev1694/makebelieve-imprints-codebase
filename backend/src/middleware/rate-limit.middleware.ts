import rateLimit from 'express-rate-limit';

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
 * Limit: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
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
 * Limit: 5 requests per 15 minutes per IP
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
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
 * Limit: 10 requests per hour per IP
 * Prevents payment fraud and abuse
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per hour
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
 * Limit: 20 uploads per hour per IP
 * Prevents storage abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
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
 * Limit: 10 orders per hour per IP
 * Prevents order spam
 */
export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 orders per hour
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
 * Limit: 200 requests per 15 minutes per IP
 * More lenient for read-only operations
 */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: rateLimitMessage,
  standardHeaders: true,
  legacyHeaders: false,
});
