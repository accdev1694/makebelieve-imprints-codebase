/**
 * Royal Mail Click & Drop API Service
 *
 * API Documentation: https://api.parcel.royalmail.com/
 * Base URL: https://api.parcel.royalmail.com/api/v1
 */

const ROYAL_MAIL_API_URL = 'https://api.parcel.royalmail.com/api/v1';

function getApiKey(): string {
  const apiKey = process.env.ROYAL_MAIL_API_KEY;
  if (!apiKey) {
    throw new Error('ROYAL_MAIL_API_KEY environment variable is not set');
  }
  return apiKey;
}

// Types for Royal Mail API
export interface RoyalMailAddress {
  fullName: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  city: string;
  county?: string;
  postcode: string;
  countryCode: string; // ISO 2-letter code (GB, US, etc.)
  phoneNumber?: string;
  emailAddress?: string;
}

export interface RoyalMailOrderItem {
  description: string;
  quantity: number;
  value: number; // in GBP
  weight: number; // in grams
  hsCode?: string; // Harmonized System code for customs
  countryOfOrigin?: string; // ISO 2-letter code
}

export interface CreateShipmentRequest {
  orderReference: string;
  recipient: RoyalMailAddress;
  sender?: RoyalMailAddress;
  packages: {
    weightInGrams: number;
    packageFormatIdentifier?: string; // e.g., "parcel", "largeLetter"
    dimensions?: {
      heightInMms: number;
      widthInMms: number;
      depthInMms: number;
    };
  }[];
  orderItems?: RoyalMailOrderItem[];
  shippingDate?: string; // ISO date
  serviceCode?: string; // e.g., "TPN24" for Tracked 24
  customsInfo?: {
    contentType: 'Sale' | 'Gift' | 'Sample' | 'Documents' | 'Return' | 'Other';
    senderType: 'Business' | 'Private';
  };
  // Required order financial details
  orderDate: string; // ISO datetime when order was placed
  subtotal: number; // Value of goods excluding shipping
  shippingCostCharged: number; // Shipping cost charged to customer
  total: number; // Total order value
  currencyCode?: string; // Default: GBP
}

export interface RoyalMailOrder {
  orderIdentifier: number;
  orderReference: string;
  createdOn: string;
  orderDate: string;
  printedOn?: string;
  manifestedOn?: string;
  shippedOn?: string;
  trackingNumber?: string;
  packages: {
    packageNumber: number;
    trackingNumber: string;
    status: string;
  }[];
}

export interface CreateShipmentResponse {
  successCount: number;
  errorsCount: number;
  createdOrders: {
    orderIdentifier: number;
    orderReference: string;
  }[];
  failedOrders: {
    orderReference: string;
    errors: string[];
  }[];
}

export interface RoyalMailError {
  message: string;
  code?: string;
  details?: string[];
}

// Country code mapping
const COUNTRY_TO_ISO: Record<string, string> = {
  'United Kingdom': 'GB',
  'Ireland': 'IE',
  'France': 'FR',
  'Germany': 'DE',
  'Spain': 'ES',
  'Italy': 'IT',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Austria': 'AT',
  'Portugal': 'PT',
  'Sweden': 'SE',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Norway': 'NO',
  'Switzerland': 'CH',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Greece': 'GR',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Canada': 'CA',
  'United States': 'US',
  'Japan': 'JP',
  'Singapore': 'SG',
  'Hong Kong': 'HK',
  'United Arab Emirates': 'AE',
};

export function getCountryCode(countryName: string): string {
  return COUNTRY_TO_ISO[countryName] || 'GB';
}

/**
 * Make an authenticated request to Royal Mail API
 */
async function royalMailRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: RoyalMailError }> {
  const apiKey = getApiKey();

  const url = `${ROYAL_MAIL_API_URL}${endpoint}`;

  try {
    console.log(`Royal Mail API: ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      console.error('Royal Mail API rate limit exceeded');
      return {
        error: {
          message: 'Rate limit exceeded. Please try again in a few seconds.',
          code: 'RATE_LIMITED',
        },
      };
    }

    // Handle auth errors
    if (response.status === 401) {
      console.error('Royal Mail API authentication failed');
      return {
        error: {
          message: 'Authentication failed. Please check your API key.',
          code: 'AUTH_FAILED',
        },
      };
    }

    const contentType = response.headers.get('content-type');

    // Handle PDF responses (for labels)
    if (contentType?.includes('application/pdf')) {
      const buffer = await response.arrayBuffer();
      return { data: Buffer.from(buffer) as unknown as T };
    }

    // Handle JSON responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Royal Mail API error:', response.status, errorData);
      return {
        error: {
          message: errorData.message || `API error: ${response.status}`,
          code: errorData.code || `HTTP_${response.status}`,
          details: errorData.errors || errorData.details,
        },
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Royal Mail API request failed:', error);
    return {
      error: {
        message: error instanceof Error ? error.message : 'Network request failed',
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Check Royal Mail API health
 */
export async function checkHealth(): Promise<{
  healthy: boolean;
  version?: string;
  error?: string;
}> {
  const { data, error } = await royalMailRequest<{
    commit: string;
    build: string;
    release: string;
    releaseDate: string;
  }>('/version');

  if (error) {
    return { healthy: false, error: error.message };
  }

  return {
    healthy: true,
    version: data?.release,
  };
}

/**
 * Create a shipment/order in Royal Mail Click & Drop
 */
export async function createShipment(
  request: CreateShipmentRequest
): Promise<{ data?: CreateShipmentResponse; error?: RoyalMailError }> {
  const payload = {
    items: [
      {
        orderReference: request.orderReference,
        recipient: {
          phoneNumber: request.recipient.phoneNumber,
          emailAddress: request.recipient.emailAddress,
          address: {
            fullName: request.recipient.fullName,
            companyName: request.recipient.companyName,
            addressLine1: request.recipient.addressLine1,
            addressLine2: request.recipient.addressLine2,
            addressLine3: request.recipient.addressLine3,
            city: request.recipient.city,
            county: request.recipient.county,
            postcode: request.recipient.postcode,
            countryCode: request.recipient.countryCode,
          },
        },
        packages: request.packages.map((pkg, index) => ({
          packageNumber: index + 1,
          weightInGrams: pkg.weightInGrams,
          packageFormatIdentifier: pkg.packageFormatIdentifier || 'parcel',
          dimensions: pkg.dimensions,
        })),
        orderItems: request.orderItems,
        shippingDate: request.shippingDate || new Date().toISOString().split('T')[0],
        serviceCode: request.serviceCode,
        customsInfo: request.customsInfo,
        // Required order financial details
        orderDate: request.orderDate,
        subtotal: request.subtotal,
        shippingCostCharged: request.shippingCostCharged,
        total: request.total,
        currencyCode: request.currencyCode || 'GBP',
      },
    ],
  };

  return royalMailRequest<CreateShipmentResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Get orders from Royal Mail Click & Drop
 */
export async function getOrders(
  orderIdentifiers: string[] | number[]
): Promise<{ data?: RoyalMailOrder[]; error?: RoyalMailError }> {
  const identifiers = orderIdentifiers
    .map((id) => (typeof id === 'string' ? encodeURIComponent(`"${id}"`) : id))
    .join(';');

  return royalMailRequest<RoyalMailOrder[]>(`/orders/${identifiers}`);
}

/**
 * Get a single order by reference
 */
export async function getOrderByReference(
  orderReference: string
): Promise<{ data?: RoyalMailOrder; error?: RoyalMailError }> {
  const { data, error } = await getOrders([orderReference]);

  if (error) {
    return { error };
  }

  if (!data || data.length === 0) {
    return {
      error: {
        message: 'Order not found',
        code: 'NOT_FOUND',
      },
    };
  }

  return { data: data[0] };
}

/**
 * Get shipping label PDF for orders
 */
export async function getLabel(
  orderIdentifiers: string[] | number[],
  options: {
    includeReturnsLabel?: boolean;
    includeCN?: boolean;
  } = {}
): Promise<{ data?: Buffer; error?: RoyalMailError }> {
  const identifiers = orderIdentifiers
    .map((id) => (typeof id === 'string' ? encodeURIComponent(`"${id}"`) : id))
    .join(';');

  const params = new URLSearchParams({
    documentType: 'postageLabel',
    includeReturnsLabel: String(options.includeReturnsLabel ?? false),
    includeCN: String(options.includeCN ?? true),
  });

  return royalMailRequest<Buffer>(`/orders/${identifiers}/label?${params}`);
}

/**
 * Delete/cancel orders
 */
export async function deleteOrders(
  orderIdentifiers: string[] | number[]
): Promise<{ data?: { deletedOrders: { orderReference: string }[]; errors: { orderReference: string; message: string }[] }; error?: RoyalMailError }> {
  const identifiers = orderIdentifiers
    .map((id) => (typeof id === 'string' ? encodeURIComponent(`"${id}"`) : id))
    .join(';');

  return royalMailRequest(`/orders/${identifiers}`, {
    method: 'DELETE',
  });
}

/**
 * Manifest orders (prepare for collection)
 */
export async function manifestOrders(
  carrierName?: string
): Promise<{
  data?: {
    manifestNumber: number;
    documentPdf?: string; // Base64 encoded PDF
  };
  error?: RoyalMailError
}> {
  return royalMailRequest('/manifests', {
    method: 'POST',
    body: JSON.stringify({ carrierName }),
  });
}

/**
 * Get manifest document
 */
export async function getManifest(
  manifestNumber: number
): Promise<{
  data?: {
    manifestNumber: number;
    status: string;
    documentPdf?: string;
  };
  error?: RoyalMailError
}> {
  return royalMailRequest(`/manifests/${manifestNumber}`);
}

/**
 * List orders with pagination
 */
export async function listOrders(
  options: {
    pageSize?: number;
    startDateTime?: string;
    endDateTime?: string;
    continuationToken?: string;
  } = {}
): Promise<{
  data?: {
    orders: RoyalMailOrder[];
    continuationToken?: string;
  };
  error?: RoyalMailError;
}> {
  const params = new URLSearchParams();

  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  if (options.startDateTime) params.set('startDateTime', options.startDateTime);
  if (options.endDateTime) params.set('endDateTime', options.endDateTime);
  if (options.continuationToken) params.set('continuationToken', options.continuationToken);

  const query = params.toString();
  return royalMailRequest(`/orders${query ? `?${query}` : ''}`);
}
