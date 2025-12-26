import { PrismaClient } from '@prisma/client';

// PrismaClient singleton for serverless environments
// Prevents multiple instances during hot reloads in development
//
// IMPORTANT: For Neon serverless, ensure your DATABASE_URL includes:
// - ?pgbouncer=true (connection pooling)
// - ?sslmode=require (SSL)
// Example: postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require&pgbouncer=true

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
