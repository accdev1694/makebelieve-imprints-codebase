import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/health
 * Health check endpoint to verify database connection
 */
export async function GET() {
  const start = Date.now();

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbTime = Date.now() - start;

    // Get counts
    const [categoryCount, productCount] = await Promise.all([
      prisma.category.count(),
      prisma.product.count(),
    ]);

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      dbResponseTime: `${dbTime}ms`,
      counts: {
        categories: categoryCount,
        products: productCount,
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Health check failed:', error);

    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: errorMessage,
      environment: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
