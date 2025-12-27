import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSubscriptionConfirmEmail } from '@/lib/server/email';
import { requireAdmin, handleApiError, AuthError } from '@/lib/server/auth';
import crypto from 'crypto';

// POST /api/subscribers - Subscribe to newsletter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, source = 'FOOTER' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if subscriber already exists
    const existingSubscriber = await prisma.subscriber.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingSubscriber) {
      if (existingSubscriber.status === 'ACTIVE') {
        return NextResponse.json(
          { message: 'You are already subscribed!' },
          { status: 200 }
        );
      }

      if (existingSubscriber.status === 'PENDING') {
        // Resend confirmation email
        const confirmToken = crypto.randomBytes(32).toString('hex');
        await prisma.subscriber.update({
          where: { id: existingSubscriber.id },
          data: {
            confirmToken,
            updatedAt: new Date(),
          },
        });

        await sendSubscriptionConfirmEmail(email, confirmToken);

        return NextResponse.json(
          { message: 'Confirmation email resent. Please check your inbox.' },
          { status: 200 }
        );
      }

      if (existingSubscriber.status === 'UNSUBSCRIBED') {
        // Re-subscribe - generate new confirm token
        const confirmToken = crypto.randomBytes(32).toString('hex');
        await prisma.subscriber.update({
          where: { id: existingSubscriber.id },
          data: {
            status: 'PENDING',
            confirmToken,
            unsubscribedAt: null,
            updatedAt: new Date(),
          },
        });

        await sendSubscriptionConfirmEmail(email, confirmToken);

        return NextResponse.json(
          { message: 'Please check your email to confirm your subscription.' },
          { status: 200 }
        );
      }
    }

    // Create new subscriber with pending status
    const confirmToken = crypto.randomBytes(32).toString('hex');
    await prisma.subscriber.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        status: 'PENDING',
        source: source,
        confirmToken,
      },
    });

    // Send confirmation email
    const emailSent = await sendSubscriptionConfirmEmail(email, confirmToken);

    if (!emailSent) {
      console.error('Failed to send confirmation email to:', email);
      // Still return success - we don't want to expose email sending issues
    }

    return NextResponse.json(
      { message: 'Please check your email to confirm your subscription.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error subscribing:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}

// GET /api/subscribers - List subscribers (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (status && ['PENDING', 'ACTIVE', 'UNSUBSCRIBED'].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          source: true,
          subscribedAt: true,
          unsubscribedAt: true,
          createdAt: true,
        },
      }),
      prisma.subscriber.count({ where }),
    ]);

    // Get counts by status
    const [activeCount, pendingCount, unsubscribedCount] = await Promise.all([
      prisma.subscriber.count({ where: { status: 'ACTIVE' } }),
      prisma.subscriber.count({ where: { status: 'PENDING' } }),
      prisma.subscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
    ]);

    return NextResponse.json({
      subscribers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        active: activeCount,
        pending: pendingCount,
        unsubscribed: unsubscribedCount,
        total: activeCount + pendingCount + unsubscribedCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
