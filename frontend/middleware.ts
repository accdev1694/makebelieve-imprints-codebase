import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRateLimiter } from '@/lib/server/rate-limiter';

/**
 * Next.js Middleware for CORS, Security Headers, and Rate Limiting
 *
 * Handles:
 * - CORS preflight requests (OPTIONS)
 * - CORS headers for allowed origins
 * - Security headers for all responses
 * - Rate limiting for sensitive endpoints (via bounded in-memory or Upstash Redis)
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

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api');

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

    const limiter = getRateLimiter();
    const rateLimit = await limiter.check(ip, pathname);
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

  // Note: Security headers (CSP, HSTS, etc.) are now configured in next.config.ts
  // This middleware only handles CORS and rate limiting for API routes

  return response;
}

// Only run middleware on API routes
export const config = {
  matcher: [
    '/api/:path*',
  ],
};
