import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for CORS and Security Headers
 *
 * Handles:
 * - CORS preflight requests (OPTIONS)
 * - CORS headers for allowed origins
 * - Security headers for all responses
 */

// Allowed origins for CORS
const allowedOrigins = [
  'https://mkbl.vercel.app',
  'https://makebelieveimprints.co.uk',
  'https://www.makebelieveimprints.co.uk',
  // Development origins
  'http://localhost:3000',
  'http://localhost:3001',
  // Mobile app origins (Capacitor)
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost', // Android WebView
];

// Check if origin is allowed
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Allow requests with no origin (same-origin, mobile apps)
  return allowedOrigins.includes(origin);
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // Handle preflight requests
  if (request.method === 'OPTIONS' && isApiRoute) {
    const response = new NextResponse(null, { status: 204 });

    if (isAllowedOrigin(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    }

    return response;
  }

  // Continue with the request
  const response = NextResponse.next();

  // Add CORS headers for API routes
  if (isApiRoute && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Security headers for all routes
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

// Only run middleware on API routes
export const config = {
  matcher: [
    '/api/:path*',
  ],
};
