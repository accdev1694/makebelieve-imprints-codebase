import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { getDesign, updateDesign, deleteDesign } from '@/lib/server/design-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/designs/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const result = await getDesign(id, user.userId, user.type === 'admin');

    if (!result.success) {
      const status = result.error === 'Access denied' ? 403 : 404;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/designs/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const result = await updateDesign(id, user.userId, user.type === 'admin', body);

    if (!result.success) {
      const status = result.error === 'Access denied' ? 403 : 404;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/designs/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const result = await deleteDesign(id, user.userId, user.type === 'admin');

    if (!result.success) {
      const status = result.error === 'Access denied' ? 403 : 404;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      message: 'Design deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
