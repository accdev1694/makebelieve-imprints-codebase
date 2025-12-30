import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Magic bytes for supported file types
const FILE_SIGNATURES: Record<string, { bytes: number[]; offset?: number }[]> = {
  'image/jpeg': [{ bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png': [{ bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  'image/gif': [{ bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }], // GIF87a and GIF89a
  'image/webp': [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }], // RIFF....WEBP
  'application/pdf': [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
};

/**
 * Validate file contents by checking magic bytes
 */
function validateMagicBytes(buffer: Buffer, declaredType: string): boolean {
  const signatures = FILE_SIGNATURES[declaredType];
  if (!signatures) return false;

  // For WebP, we need to check both RIFF header and WEBP marker
  if (declaredType === 'image/webp') {
    const hasRiff = signatures[0].bytes.every((byte, i) => buffer[i] === byte);
    const hasWebp = buffer.length > 12 && signatures[1].bytes.every((byte, i) => buffer[8 + i] === byte);
    return hasRiff && hasWebp;
  }

  // For other types, check if any signature matches
  return signatures.some(sig => {
    const offset = sig.offset || 0;
    return sig.bytes.every((byte, i) => buffer[offset + i] === byte);
  });
}

/**
 * Get actual file type from magic bytes
 */
function detectFileType(buffer: Buffer): string | null {
  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    if (mimeType === 'image/webp') {
      const hasRiff = signatures[0].bytes.every((byte, i) => buffer[i] === byte);
      const hasWebp = buffer.length > 12 && signatures[1].bytes.every((byte, i) => buffer[8 + i] === byte);
      if (hasRiff && hasWebp) return mimeType;
      continue;
    }

    const matches = signatures.some(sig => {
      const offset = sig.offset || 0;
      return sig.bytes.every((byte, i) => buffer[offset + i] === byte);
    });
    if (matches) return mimeType;
  }
  return null;
}

/**
 * POST /api/uploads
 * Upload a file (stores locally in development, use cloud storage in production)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate declared MIME type first
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    // Read file bytes to validate magic bytes
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate magic bytes match declared type
    if (!validateMagicBytes(buffer, file.type)) {
      const detectedType = detectFileType(buffer);
      console.warn(`File type mismatch: declared=${file.type}, detected=${detectedType || 'unknown'}`);
      return NextResponse.json(
        { error: 'File content does not match declared type. Please upload a valid file.' },
        { status: 400 }
      );
    }

    // Generate unique filename with validated extension
    const timestamp = Date.now();
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };
    const ext = extMap[file.type] || file.name.split('.').pop();
    const filename = `${user.userId}-${timestamp}.${ext}`;

    // For local development, save to public/uploads
    // In production, you'd use Vercel Blob, Cloudflare R2, or similar
    const uploadDir = join(process.cwd(), 'public', 'uploads');

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Use the buffer we already read for magic bytes validation
    await writeFile(join(uploadDir, filename), buffer);

    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        filename: filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
