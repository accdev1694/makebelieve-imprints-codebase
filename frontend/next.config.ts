import type { NextConfig } from 'next';

// Check if building for mobile (Capacitor)
const isMobileBuild = process.env.BUILD_TARGET === 'mobile';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy
 *
 * Note: 'unsafe-inline' is still required for:
 * - Next.js inline scripts (hydration, etc.)
 * - Inline styles from Next.js and component libraries
 *
 * To fully remove 'unsafe-inline', we would need:
 * - Implement nonce-based CSP with custom Document
 * - Update all components to avoid inline styles
 *
 * 'unsafe-eval' is required by:
 * - Stripe.js for payment processing
 */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://api.stripe.com https://*.stripe.com wss://*.stripe.com https://challenges.cloudflare.com;
  frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

/**
 * Security headers applied to all routes
 */
const securityHeaders = [
  // Prevent XSS attacks
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Restrict browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
  // Only in production: HSTS
  ...(isProduction
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // For Capacitor mobile apps, use static export
  ...(isMobileBuild && { output: 'export' }),

  // Trailing slashes required for static export compatibility
  ...(isMobileBuild && { trailingSlash: true }),

  // Image optimization (disabled for static export, enabled for web)
  images: {
    ...(isMobileBuild && { unoptimized: true }),
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'mkbl.vercel.app',
        pathname: '/**',
      },
    ],
  },

  // Environment variables for mobile builds
  env: {
    NEXT_PUBLIC_IS_MOBILE: isMobileBuild ? 'true' : 'false',
  },

  // Security headers (only for non-mobile builds)
  ...(!isMobileBuild && {
    async headers() {
      return [
        {
          // Apply security headers to all routes
          source: '/:path*',
          headers: securityHeaders,
        },
      ];
    },
  }),
};

export default nextConfig;
