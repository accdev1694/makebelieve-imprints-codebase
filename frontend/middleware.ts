import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for CORS, Security Headers, and Rate Limiting
 *
 * Handles:
 * - CORS preflight requests (OPTIONS)
 * - CORS headers for allowed origins
 * - Security headers for all responses
 * - Basic rate limiting for sensitive endpoints
 */

// Environment check
const isProduction = process.env.NODE_ENV === 'production';

// Allowed origins for CORS
const allowedOrigins = [
  'https://mkbl.vercel.app',
  'https://makebelieveimprints.co.uk',
  'https://www.makebelieveimprints.co.uk',
  // Development origins (only used in development)
  ...(isProduction ? [] : [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost',
  ]),
  // Mobile app origins (Capacitor) - these don't send Origin header typically
  'capacitor://localhost',
  'ionic://localhost',
];

// Rate limiting storage (in-memory, resets on deploy - use Redis for production scale)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration per endpoint pattern
const rateLimitConfig: Record<string, { maxRequests: number; windowMs: number }> = {
  '/api/auth/login': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  '/api/auth/register': { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  '/api/auth/forgot-password': { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  '/api/subscribers': { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
};

// Check if origin is allowed
function isAllowedOrigin(origin: string | null, pathname: string, request: NextRequest): boolean {
  // Allow webhooks, cron jobs, and health checks (server-to-server)
  if (pathname.startsWith('/api/webhooks/')) return true;
  if (pathname.startsWith('/api/cron/')) return true;
  if (pathname === '/api/health') return true;

  // If origin is present, check against allowed list
  if (origin) {
    return allowedOrigins.includes(origin);
  }

  // No origin header - check if it's a same-origin request
  // Same-origin fetch requests often don't include Origin header
  // Check Sec-Fetch-Site header (modern browsers) or Referer
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'same-origin' || secFetchSite === 'same-site') {
    return true;
  }

  // Check Referer as fallback
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      return allowedOrigins.includes(refererOrigin);
    } catch {
      // Invalid referer URL
    }
  }

  // In development, allow requests without origin
  if (!isProduction) return true;

  // In production with no origin and no valid referer, block
  return false;
}

// Simple rate limiting check
function checkRateLimit(ip: string, pathname: string): { allowed: boolean; retryAfter?: number } {
  const config = Object.entries(rateLimitConfig).find(([pattern]) => pathname.startsWith(pattern));
  if (!config) return { allowed: true };

  const [, { maxRequests, windowMs }] = config;
  const key = `${ip}:${pathname}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

// Clean up old rate limit entries periodically (every 100 requests)
let requestCount = 0;
function cleanupRateLimitStore() {
  requestCount++;
  if (requestCount % 100 === 0) {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api');

  // Clean up rate limit store periodically
  cleanupRateLimitStore();

  // Handle preflight requests
  if (request.method === 'OPTIONS' && isApiRoute) {
    const response = new NextResponse(null, { status: 204 });

    if (isAllowedOrigin(origin, pathname, request)) {
      response.headers.set('Access-Control-Allow-Origin', origin || (isProduction ? '' : '*'));
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    }

    return response;
  }

  // Check CORS for API routes
  if (isApiRoute && !isAllowedOrigin(origin, pathname, request)) {
    return NextResponse.json(
      { error: 'Origin not allowed' },
      { status: 403 }
    );
  }

  // Rate limiting for sensitive endpoints
  if (isApiRoute && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const rateLimit = checkRateLimit(ip, pathname);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 60),
          },
        }
      );
    }
  }

  // Continue with the request
  const response = NextResponse.next();

  // Add CORS headers for API routes
  if (isApiRoute && origin && isAllowedOrigin(origin, pathname, request)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Security headers for all routes
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Additional security headers for production
  if (isProduction) {
    // HSTS - enforce HTTPS for 1 year, include subdomains
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Content Security Policy - adjust as needed for your app
    response.headers.set('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.stripe.com https://*.stripe.com wss://*.stripe.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '));

    // Permissions Policy
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  }

  return response;
}

// Only run middleware on API routes
export const config = {
  matcher: [
    '/api/:path*',
  ],
};
