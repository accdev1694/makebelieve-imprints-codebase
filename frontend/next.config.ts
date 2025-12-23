import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // For Capacitor mobile apps, use static export
  // Uncomment when ready for mobile build:
  // output: 'export',

  // Image optimization (disabled for static export)
  images: {
    // unoptimized: true, // Enable when using static export
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
    ],
  },
};

export default nextConfig;
