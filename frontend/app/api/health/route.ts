import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Health check endpoint - first without DB to verify API works
 */
export async function GET() {
  // Step 1: Check if API routes work at all
  const envCheck = {
    status: 'ok',
    apiWorking: true,
    environment: process.env.NODE_ENV,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlStart: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.substring(0, 50) + '...'
      : 'NOT SET',
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(envCheck);
}
