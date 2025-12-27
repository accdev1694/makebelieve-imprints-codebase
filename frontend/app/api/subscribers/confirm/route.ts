import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/server/email';
import { ensureWelcome10Promo } from '@/lib/server/promo-service';

// GET /api/subscribers/confirm?token=xxx - Confirm subscription
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/subscribe/confirm?error=missing_token', request.url)
      );
    }

    // Find subscriber by confirm token
    const subscriber = await prisma.subscriber.findFirst({
      where: { confirmToken: token },
    });

    if (!subscriber) {
      return NextResponse.redirect(
        new URL('/subscribe/confirm?error=invalid_token', request.url)
      );
    }

    if (subscriber.status === 'ACTIVE') {
      return NextResponse.redirect(
        new URL('/subscribe/confirm?status=already_confirmed', request.url)
      );
    }

    // Update subscriber to active
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        status: 'ACTIVE',
        confirmToken: null,
        subscribedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Ensure WELCOME10 promo exists
    await ensureWelcome10Promo();

    // Send welcome email with discount code
    await sendWelcomeEmail(subscriber.email);

    return NextResponse.redirect(
      new URL('/subscribe/confirm?status=success', request.url)
    );
  } catch (error) {
    console.error('Error confirming subscription:', error);
    return NextResponse.redirect(
      new URL('/subscribe/confirm?error=server_error', request.url)
    );
  }
}
