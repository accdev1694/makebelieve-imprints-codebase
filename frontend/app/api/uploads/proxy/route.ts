import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';

// Configure route segment for larger uploads
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds timeout

/**
 * PUT /api/uploads/proxy
 * Upload a file - stores as data URL for now (R2 integration can be added later)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'upload';

    // Get file data from request body
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const fileBuffer = await request.arrayBuffer();

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (fileBuffer.byteLength > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFilename = `designs/${user.userId}/${timestamp}-${filename}`;

    // For now, use data URL (works for testing)
    // TODO: Integrate with Cloudflare R2 for production storage
    const base64 = Buffer.from(fileBuffer).toString('base64');
    const fileUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      data: {
        fileUrl,
        filename: uniqueFilename,
        originalName: filename,
        size: fileBuffer.byteLength,
        type: contentType,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return handleApiError(error);
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
