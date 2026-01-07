import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';

/**
 * Prisma Client with Neon Adapter
 *
 * This configuration provides:
 * - HTTP-based connection pooling optimized for serverless (Vercel)
 * - Automatic connection management via Neon's pooler
 * - No cold start connection issues
 * - Better performance under high concurrency
 *
 * Environment Variables:
 * - DATABASE_URL: Pooled connection string (with -pooler suffix)
 *   Example: postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require
 * - DATABASE_URL_UNPOOLED: Direct connection (for migrations)
 *   Example: postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Use Neon HTTP adapter for serverless environments (Vercel)
  // In development without Neon, fall back to standard connection
  const isNeonConnection = connectionString.includes('neon.tech');

  if (isNeonConnection) {
    // Use HTTP-based adapter for serverless (faster cold starts, no WebSocket)
    const adapter = new PrismaNeonHTTP(connectionString, {
      arrayMode: false,
      fullResults: true,
    });

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  // Fallback for non-Neon databases (local development)
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
