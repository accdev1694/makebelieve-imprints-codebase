import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // For Capacitor mobile apps, use static export
  // Uncomment when ready for mobile build:
  // output: 'export',

  // Image optimization (disabled for static export)
  images: {
    // unoptimized: true, // Enable when using static export
  },
};

export default nextConfig;
