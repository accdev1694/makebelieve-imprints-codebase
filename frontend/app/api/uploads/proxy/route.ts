import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 configuration (S3-compatible API)
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'makebelieve-uploads';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Initialize S3 client for R2
const getR2Client = () => {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
};

/**
 * PUT /api/uploads/proxy
 * Upload a file to Cloudflare R2 storage
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
    const ext = filename.split('.').pop() || 'bin';
    const uniqueFilename = `designs/${user.userId}/${timestamp}-${filename}`;

    // Try R2 upload
    const r2Client = getR2Client();

    if (r2Client && R2_PUBLIC_URL) {
      // Upload to R2
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: uniqueFilename,
          Body: Buffer.from(fileBuffer),
          ContentType: contentType,
        })
      );

      const fileUrl = `${R2_PUBLIC_URL}/${uniqueFilename}`;

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
    }

    // Fallback: Return a placeholder URL for development/testing
    // In production, R2 should be configured
    console.warn('R2 not configured, using placeholder URL');

    // Use a data URL for development (not ideal but works)
    const base64 = Buffer.from(fileBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      data: {
        fileUrl: dataUrl,
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
