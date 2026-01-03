/**
 * R2 Storage Service
 * Handles file uploads to Cloudflare R2 (S3-compatible)
 * Falls back gracefully when R2 is not configured
 */

import crypto from 'crypto';

// R2 Configuration from environment variables
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL; // e.g., https://files.makebelieveimprints.co.uk

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
}

/**
 * Generate AWS Signature Version 4 for S3-compatible APIs
 */
function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Buffer {
  const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  return kSigning;
}

/**
 * Create a signed request for R2
 */
function signRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  payload: Buffer | string,
  contentType: string
): Record<string, string> {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID) {
    throw new Error('R2 credentials not configured');
  }

  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  // Create payload hash
  const payloadHash = crypto
    .createHash('sha256')
    .update(typeof payload === 'string' ? payload : payload)
    .digest('hex');

  // Canonical headers
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n';

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  // Canonical request
  const canonicalRequest = [
    method,
    path,
    '', // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // String to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  // Signature
  const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  // Authorization header
  const authorization = `${algorithm} Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Content-Type': contentType,
    'Host': host,
    'X-Amz-Content-Sha256': payloadHash,
    'X-Amz-Date': amzDate,
    'Authorization': authorization,
  };
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Upload a file to R2 storage
 *
 * @param buffer - File buffer to upload
 * @param key - Storage key (path) for the file, e.g., "invoices/2024/INV-001.pdf"
 * @param contentType - MIME type of the file
 * @returns Upload result with URL or error
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<UploadResult> {
  if (!isR2Configured()) {
    console.warn('[R2] Storage not configured - R2 upload skipped');
    return {
      success: false,
      error: 'R2 storage not configured. Set CLOUDFLARE_R2_* environment variables.',
    };
  }

  try {
    const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const path = `/${R2_BUCKET_NAME}/${key}`;
    const url = `https://${host}${path}`;

    const headers = signRequest('PUT', path, {}, buffer, contentType);

    // Convert Buffer to Uint8Array for fetch compatibility
    const bodyData = new Uint8Array(buffer);

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: bodyData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[R2] Upload failed:', response.status, errorText);
      return {
        success: false,
        error: `R2 upload failed: ${response.status} ${response.statusText}`,
      };
    }

    // Build public URL
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://${host}/${R2_BUCKET_NAME}/${key}`;

    console.log(`[R2] Successfully uploaded: ${key}`);
    return {
      success: true,
      url: publicUrl,
      key,
    };
  } catch (error) {
    console.error('[R2] Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFromR2(key: string): Promise<{ success: boolean; error?: string }> {
  if (!isR2Configured()) {
    return { success: false, error: 'R2 storage not configured' };
  }

  try {
    const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const path = `/${R2_BUCKET_NAME}/${key}`;
    const url = `https://${host}${path}`;

    const headers = signRequest('DELETE', path, {}, '', 'application/octet-stream');

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok && response.status !== 404) {
      return {
        success: false,
        error: `R2 delete failed: ${response.status} ${response.statusText}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[R2] Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown delete error',
    };
  }
}

/**
 * Generate a unique storage key for invoices
 */
export function generateInvoiceKey(invoiceNumber: string): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `invoices/${year}/${month}/${invoiceNumber}.pdf`;
}
