import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/campaigns/[id]/duplicate - Duplicate an existing campaign
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    // Find the original campaign
    const original = await prisma.emailCampaign.findUnique({
      where: { id },
    });

    if (!original) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Create a copy as a new draft
    const duplicate = await prisma.emailCampaign.create({
      data: {
        name: `${original.name} (Copy)`,
        subject: original.subject,
        previewText: original.previewText,
        content: original.content,
        plainText: original.plainText,
        type: original.type,
        promoId: original.promoId,
        status: 'DRAFT',
        scheduledAt: null,
        sentAt: null,
        recipientCount: 0,
        sentCount: 0,
        failedCount: 0,
      },
    });

    return NextResponse.json({
      campaign: duplicate,
      message: 'Campaign duplicated successfully',
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
