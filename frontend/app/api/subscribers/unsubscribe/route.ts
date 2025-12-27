import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/subscribers/unsubscribe - Unsubscribe from newsletter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find subscriber
    const subscriber = await prisma.subscriber.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!subscriber) {
      // Don't reveal if email exists or not for privacy
      return NextResponse.json(
        { message: 'If you were subscribed, you have been unsubscribed.' },
        { status: 200 }
      );
    }

    if (subscriber.status === 'UNSUBSCRIBED') {
      return NextResponse.json(
        { message: 'You are already unsubscribed.' },
        { status: 200 }
      );
    }

    // Update subscriber to unsubscribed
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        status: 'UNSUBSCRIBED',
        unsubscribedAt: new Date(),
        confirmToken: null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: 'You have been successfully unsubscribed.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe. Please try again.' },
      { status: 500 }
    );
  }
}
