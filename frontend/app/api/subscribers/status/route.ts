import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/subscribers/status?email=xxx - Check subscription status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        status: true,
        subscribedAt: true,
      },
    });

    if (!subscriber) {
      return NextResponse.json({
        subscribed: false,
        status: null,
      });
    }

    return NextResponse.json({
      subscribed: subscriber.status === 'ACTIVE',
      status: subscriber.status,
      subscribedAt: subscriber.subscribedAt,
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}
