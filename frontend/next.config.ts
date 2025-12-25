import type { NextConfig } from 'next';

// Check if building for mobile (Capacitor)
const isMobileBuild = process.env.BUILD_TARGET === 'mobile';

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
};

export default nextConfig;
