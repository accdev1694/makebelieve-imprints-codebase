/**
 * Product Search Service
 * Aggregates product search across multiple marketplaces
 *
 * Supported sources:
 * - Amazon (Product Advertising API 5.0)
 * - eBay (Browse API)
 * - AliExpress (Affiliate API)
 * - Google Shopping (Custom Search API)
 */

import prisma from '@/lib/prisma';
import * as crypto from 'crypto';

// ============================================================================
// AWS Signature V4 Helper Functions (for Amazon PA-API)
// ============================================================================

function getAmzDate(): { amzDate: string; dateStamp: string } {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  return { amzDate, dateStamp };
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  return kSigning;
}

function createAwsSignatureV4(
  method: string,
  host: string,
  path: string,
  headers: Record<string, string>,
  payload: string,
  accessKey: string,
  secretKey: string,
  region: string,
  service: string
): { signedHeaders: Record<string, string>; authorization: string } {
  const { amzDate, dateStamp } = getAmzDate();

  // Add required headers
  const allHeaders: Record<string, string> = {
    ...headers,
    host,
    'x-amz-date': amzDate,
  };

  // Create canonical headers (sorted, lowercase)
  const sortedHeaderKeys = Object.keys(allHeaders).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((key) => `${key.toLowerCase()}:${allHeaders[key].trim()}`)
    .join('\n') + '\n';
  const signedHeaders = sortedHeaderKeys.map((k) => k.toLowerCase()).join(';');

  // Create canonical request
  const payloadHash = sha256(payload);
  const canonicalRequest = [
    method,
    path,
    '', // No query string for POST
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  // Calculate signature
  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = hmacSha256(signingKey, stringToSign).toString('hex');

  // Create authorization header
  const authorization = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    signedHeaders: {
      ...allHeaders,
      'x-amz-date': amzDate,
    },
    authorization,
  };
}

// ============================================================================
// AliExpress TOP API Signature Helper
// ============================================================================

function createAliExpressSignature(
  params: Record<string, string>,
  secretKey: string
): string {
  // Sort parameters alphabetically
  const sortedKeys = Object.keys(params).sort();

  // Concatenate key-value pairs
  let signString = secretKey;
  for (const key of sortedKeys) {
    signString += key + params[key];
  }
  signString += secretKey;

  // Create HMAC-SHA256 signature and convert to uppercase hex
  return crypto
    .createHmac('sha256', secretKey)
    .update(signString, 'utf8')
    .digest('hex')
    .toUpperCase();
}

export interface ProductSearchResult {
  id: string;
  source: 'amazon' | 'ebay' | 'aliexpress' | 'google';
  title: string;
  price: number;
  currency: string;
  imageUrl?: string;
  productUrl: string;
  sellerName?: string;
  sellerRating?: number;
  condition?: string;
  shipping?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  sources?: ('amazon' | 'ebay' | 'aliexpress' | 'google')[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'relevance' | 'rating';
  limit?: number;
}

interface SearchResponse {
  success: boolean;
  results: ProductSearchResult[];
  sources: {
    source: string;
    count: number;
    error?: string;
  }[];
  totalResults: number;
}

// Check which APIs are configured
function getConfiguredSources(): string[] {
  const sources: string[] = [];

  if (process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY) {
    sources.push('amazon');
  }
  if (process.env.EBAY_APP_ID) {
    sources.push('ebay');
  }
  if (process.env.ALIEXPRESS_APP_KEY) {
    sources.push('aliexpress');
  }
  if (process.env.GOOGLE_SHOPPING_API_KEY) {
    sources.push('google');
  }

  return sources;
}

/**
 * Search Amazon Product Advertising API 5.0
 * Uses AWS Signature Version 4 for authentication
 */
async function searchAmazon(query: string, limit: number = 10): Promise<ProductSearchResult[]> {
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;

  if (!accessKey || !secretKey || !partnerTag) {
    console.log('Amazon API not configured');
    return [];
  }

  try {
    const host = 'webservices.amazon.co.uk';
    const path = '/paapi5/searchitems';
    const region = 'eu-west-1';
    const service = 'ProductAdvertisingAPI';

    const requestBody = {
      PartnerTag: partnerTag,
      PartnerType: 'Associates',
      Keywords: query,
      SearchIndex: 'All',
      ItemCount: Math.min(limit, 10), // Amazon limits to 10 per request
      Resources: [
        'ItemInfo.Title',
        'ItemInfo.ByLineInfo',
        'ItemInfo.ProductInfo',
        'Offers.Listings.Price',
        'Offers.Listings.DeliveryInfo.IsPrimeEligible',
        'Offers.Listings.Condition',
        'Offers.Listings.MerchantInfo',
        'Images.Primary.Large',
      ],
    };

    const payload = JSON.stringify(requestBody);

    // Headers required for PA-API
    const headers: Record<string, string> = {
      'content-type': 'application/json; charset=utf-8',
      'content-encoding': 'amz-1.0',
      'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
    };

    // Create AWS Signature V4
    const { signedHeaders, authorization } = createAwsSignatureV4(
      'POST',
      host,
      path,
      headers,
      payload,
      accessKey,
      secretKey,
      region,
      service
    );

    const response = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        ...signedHeaders,
        'content-type': 'application/json; charset=utf-8',
        'content-encoding': 'amz-1.0',
        'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
        'Authorization': authorization,
      },
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Amazon API error:', response.status, errorText);
      return [];
    }

    const data = await response.json();

    if (!data.SearchResult?.Items) {
      return [];
    }

    return data.SearchResult.Items.map((item: Record<string, unknown>) => {
      const itemInfo = item.ItemInfo as Record<string, unknown> | undefined;
      const offers = item.Offers as Record<string, unknown> | undefined;
      const images = item.Images as Record<string, unknown> | undefined;

      // Get the best available price
      const listings = (offers?.Listings as Record<string, unknown>[]) || [];
      const firstListing = listings[0];
      const price = firstListing?.Price as Record<string, unknown> | undefined;
      const merchant = firstListing?.MerchantInfo as Record<string, unknown> | undefined;
      const condition = firstListing?.Condition as Record<string, unknown> | undefined;
      const deliveryInfo = firstListing?.DeliveryInfo as Record<string, unknown> | undefined;

      // Get title
      const titleInfo = itemInfo?.Title as Record<string, unknown> | undefined;
      const title = (titleInfo?.DisplayValue as string) || 'Unknown Product';

      // Get manufacturer/brand
      const byLineInfo = itemInfo?.ByLineInfo as Record<string, unknown> | undefined;
      const brand = byLineInfo?.Brand as Record<string, unknown> | undefined;
      const manufacturer = byLineInfo?.Manufacturer as Record<string, unknown> | undefined;
      const sellerName = (brand?.DisplayValue as string) ||
        (manufacturer?.DisplayValue as string) ||
        (merchant?.Name as string) ||
        'Amazon';

      // Get image
      const primaryImage = images?.Primary as Record<string, unknown> | undefined;
      const largeImage = primaryImage?.Large as Record<string, unknown> | undefined;
      const imageUrl = largeImage?.URL as string | undefined;

      // Get condition text
      const conditionValue = condition?.Value as string;
      const conditionText = conditionValue === 'New' ? 'New' :
        conditionValue === 'Used' ? 'Used' : conditionValue;

      // Check Prime eligibility
      const isPrime = deliveryInfo?.IsPrimeEligible as boolean;

      return {
        id: item.ASIN as string,
        source: 'amazon' as const,
        title,
        price: price?.Amount ? parseFloat(price.Amount as string) : 0,
        currency: (price?.Currency as string) || 'GBP',
        imageUrl,
        productUrl: item.DetailPageURL as string,
        sellerName,
        condition: conditionText,
        shipping: isPrime ? 'Prime' : undefined,
        metadata: {
          asin: item.ASIN,
          isPrime,
          condition: conditionValue,
        },
      };
    });

  } catch (error) {
    console.error('Amazon search error:', error);
    return [];
  }
}

/**
 * Search eBay Browse API
 */
async function searchEbay(query: string, limit: number = 10): Promise<ProductSearchResult[]> {
  const appId = process.env.EBAY_APP_ID;

  if (!appId) {
    console.log('eBay API not configured');
    return [];
  }

  try {
    // eBay Browse API (production)
    const endpoint = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      filter: 'deliveryCountry:GB',
    });

    const response = await fetch(`${endpoint}?${params}`, {
      headers: {
        'Authorization': `Bearer ${appId}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
      },
    });

    if (!response.ok) {
      console.error('eBay API error:', response.status);
      return [];
    }

    const data = await response.json();

    return (data.itemSummaries || []).map((item: Record<string, unknown>) => ({
      id: item.itemId as string,
      source: 'ebay' as const,
      title: item.title as string,
      price: parseFloat((item.price as { value: string })?.value || '0'),
      currency: (item.price as { currency: string })?.currency || 'GBP',
      imageUrl: (item.image as { imageUrl: string })?.imageUrl,
      productUrl: item.itemWebUrl as string,
      sellerName: (item.seller as { username: string })?.username,
      sellerRating: (item.seller as { feedbackPercentage: string })?.feedbackPercentage
        ? parseFloat((item.seller as { feedbackPercentage: string }).feedbackPercentage) / 100
        : undefined,
      condition: item.condition as string,
      metadata: { itemId: item.itemId },
    }));

  } catch (error) {
    console.error('eBay search error:', error);
    return [];
  }
}

/**
 * Search AliExpress Affiliate API
 * Uses TOP (Taobao Open Platform) signature for authentication
 */
async function searchAliExpress(query: string, limit: number = 10): Promise<ProductSearchResult[]> {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const secretKey = process.env.ALIEXPRESS_SECRET_KEY;
  const trackingId = process.env.ALIEXPRESS_TRACKING_ID;

  if (!appKey || !secretKey) {
    console.log('AliExpress API not configured');
    return [];
  }

  try {
    const endpoint = 'https://api-sg.aliexpress.com/sync';
    const method = 'aliexpress.affiliate.product.query';
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Build base parameters
    const baseParams: Record<string, string> = {
      app_key: appKey,
      method,
      sign_method: 'sha256',
      timestamp,
      format: 'json',
      v: '2.0',
    };

    // Build business parameters
    const businessParams: Record<string, string> = {
      keywords: query,
      page_size: Math.min(limit, 50).toString(), // AliExpress max is 50
      page_no: '1',
      target_currency: 'GBP',
      target_language: 'EN',
      ship_to_country: 'GB',
      sort: 'SALE_PRICE_ASC',
    };

    // Add tracking ID if configured
    if (trackingId) {
      businessParams.tracking_id = trackingId;
    }

    // Combine all parameters for signing
    const allParams = { ...baseParams, ...businessParams };

    // Generate signature
    const signature = createAliExpressSignature(allParams, secretKey);
    allParams.sign = signature;

    // Build request URL
    const urlParams = new URLSearchParams(allParams);
    const response = await fetch(`${endpoint}?${urlParams.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AliExpress API error:', response.status, errorText);
      return [];
    }

    const data = await response.json();

    // Check for API errors
    if (data.error_response) {
      console.error('AliExpress API error:', data.error_response);
      return [];
    }

    // Extract products from response
    const result = data.aliexpress_affiliate_product_query_response?.resp_result;
    if (!result?.result?.products?.product) {
      return [];
    }

    const products = result.result.products.product;

    return products.map((item: Record<string, unknown>) => {
      // Get price info
      const targetPrice = item.target_sale_price as string;
      const originalPrice = item.target_original_price as string;
      const price = parseFloat(targetPrice || originalPrice || '0');

      // Get image URL (prefer main image)
      const imageUrl = (item.product_main_image_url as string) ||
        ((item.product_small_image_urls as Record<string, string[]>)?.string?.[0]);

      // Get seller/shop info
      const shopName = item.shop_name as string;
      const shopUrl = item.shop_url as string;

      // Get product ratings
      const evaluateRate = item.evaluate_rate as string;
      const rating = evaluateRate ? parseFloat(evaluateRate.replace('%', '')) / 100 : undefined;

      // Get shipping info
      const shippingInfo = item.logistics_info_dto as Record<string, unknown> | undefined;
      const freeShipping = shippingInfo?.free_shipping as boolean;

      // Get discount info
      const discount = item.discount as string;

      return {
        id: item.product_id as string,
        source: 'aliexpress' as const,
        title: item.product_title as string,
        price,
        currency: 'GBP',
        imageUrl,
        productUrl: item.promotion_link as string || item.product_detail_url as string,
        sellerName: shopName || 'AliExpress Seller',
        sellerRating: rating,
        shipping: freeShipping ? 'Free shipping' : undefined,
        metadata: {
          productId: item.product_id,
          originalPrice: parseFloat(originalPrice || '0'),
          discount,
          salesCount: item.lastest_volume as number,
          shopUrl,
          categoryId: item.first_level_category_id,
          hotProduct: item.hot_product_commission_rate,
        },
      };
    });

  } catch (error) {
    console.error('AliExpress search error:', error);
    return [];
  }
}

/**
 * Search Google Shopping via Custom Search API
 */
async function searchGoogle(query: string, limit: number = 10): Promise<ProductSearchResult[]> {
  const apiKey = process.env.GOOGLE_SHOPPING_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    console.log('Google Shopping API not configured');
    return [];
  }

  try {
    const endpoint = 'https://www.googleapis.com/customsearch/v1';
    const params = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: query,
      num: Math.min(limit, 10).toString(), // Google limits to 10 per request
      tbm: 'shop', // Shopping search
      gl: 'uk', // Country
    });

    const response = await fetch(`${endpoint}?${params}`);

    if (!response.ok) {
      console.error('Google API error:', response.status);
      return [];
    }

    const data = await response.json();

    return (data.items || []).map((item: Record<string, unknown>, index: number) => {
      const product = item.product as Record<string, unknown> | undefined;
      return {
        id: `google-${index}-${Date.now()}`,
        source: 'google' as const,
        title: item.title as string,
        price: product?.offers
          ? parseFloat(((product.offers as Record<string, unknown>[])[0]?.price as string) || '0')
          : 0,
        currency: 'GBP',
        imageUrl: (item.pagemap as Record<string, unknown[]>)?.cse_image?.[0]
          ? ((item.pagemap as Record<string, unknown[]>).cse_image[0] as Record<string, string>).src
          : undefined,
        productUrl: item.link as string,
        sellerName: item.displayLink as string,
        metadata: { snippet: item.snippet },
      };
    });

  } catch (error) {
    console.error('Google search error:', error);
    return [];
  }
}

/**
 * Aggregate search across all configured sources
 */
export async function searchProducts(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const {
    sources = ['amazon', 'ebay', 'aliexpress', 'google'],
    minPrice,
    maxPrice,
    sortBy = 'relevance',
    limit = 20,
  } = options;

  const configuredSources = getConfiguredSources();
  const sourcesToSearch = sources.filter(s => configuredSources.includes(s));

  const sourceResults: { source: string; count: number; error?: string }[] = [];
  let allResults: ProductSearchResult[] = [];

  // Search each source in parallel
  const searchPromises = sourcesToSearch.map(async (source) => {
    try {
      let results: ProductSearchResult[] = [];
      const perSourceLimit = Math.ceil(limit / sourcesToSearch.length);

      switch (source) {
        case 'amazon':
          results = await searchAmazon(query, perSourceLimit);
          break;
        case 'ebay':
          results = await searchEbay(query, perSourceLimit);
          break;
        case 'aliexpress':
          results = await searchAliExpress(query, perSourceLimit);
          break;
        case 'google':
          results = await searchGoogle(query, perSourceLimit);
          break;
      }

      sourceResults.push({ source, count: results.length });
      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      sourceResults.push({ source, count: 0, error: message });
      return [];
    }
  });

  const resultsArrays = await Promise.all(searchPromises);
  allResults = resultsArrays.flat();

  // Filter by price if specified
  if (minPrice !== undefined) {
    allResults = allResults.filter(r => r.price >= minPrice);
  }
  if (maxPrice !== undefined) {
    allResults = allResults.filter(r => r.price <= maxPrice);
  }

  // Sort results
  switch (sortBy) {
    case 'price_asc':
      allResults.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      allResults.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      allResults.sort((a, b) => (b.sellerRating || 0) - (a.sellerRating || 0));
      break;
    // 'relevance' keeps original order
  }

  // Limit total results
  allResults = allResults.slice(0, limit);

  // Add unconfigured sources to response
  const unconfiguredSources = sources.filter(s => !configuredSources.includes(s));
  unconfiguredSources.forEach(source => {
    sourceResults.push({ source, count: 0, error: 'API not configured' });
  });

  return {
    success: true,
    results: allResults,
    sources: sourceResults,
    totalResults: allResults.length,
  };
}

/**
 * Save a product to favorites/wishlist
 */
export async function saveProduct(
  product: ProductSearchResult,
  adminUserId: string,
  notes?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const saved = await prisma.savedProduct.upsert({
      where: {
        source_externalId: {
          source: product.source,
          externalId: product.id,
        },
      },
      update: {
        price: product.price,
        notes: notes || undefined,
      },
      create: {
        source: product.source,
        externalId: product.id,
        title: product.title,
        price: product.price,
        currency: product.currency,
        imageUrl: product.imageUrl,
        productUrl: product.productUrl,
        sellerName: product.sellerName,
        sellerRating: product.sellerRating,
        metadata: product.metadata ? JSON.parse(JSON.stringify(product.metadata)) : undefined,
        notes,
        createdBy: adminUserId,
      },
    });

    return { success: true, id: saved.id };
  } catch (error) {
    console.error('Save product error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save product'
    };
  }
}

/**
 * Get saved products for admin
 */
export async function getSavedProducts(
  adminUserId: string,
  source?: string
): Promise<ProductSearchResult[]> {
  const where: { createdBy: string; source?: string } = { createdBy: adminUserId };
  if (source) {
    where.source = source;
  }

  const saved = await prisma.savedProduct.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return saved.map(p => ({
    id: p.externalId,
    source: p.source as 'amazon' | 'ebay' | 'aliexpress' | 'google',
    title: p.title,
    price: Number(p.price),
    currency: p.currency,
    imageUrl: p.imageUrl || undefined,
    productUrl: p.productUrl,
    sellerName: p.sellerName || undefined,
    sellerRating: p.sellerRating ? Number(p.sellerRating) : undefined,
    metadata: p.metadata as Record<string, unknown> | undefined,
  }));
}

/**
 * Remove a saved product
 */
export async function removeSavedProduct(
  productId: string,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.savedProduct.deleteMany({
      where: {
        id: productId,
        createdBy: adminUserId,
      },
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove product'
    };
  }
}

/**
 * Get status of configured API sources
 */
export function getConfiguredSourcesStatus(): {
  source: string;
  configured: boolean;
  envVars: string[];
}[] {
  return [
    {
      source: 'amazon',
      configured: !!(process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY),
      envVars: ['AMAZON_ACCESS_KEY', 'AMAZON_SECRET_KEY', 'AMAZON_PARTNER_TAG'],
    },
    {
      source: 'ebay',
      configured: !!process.env.EBAY_APP_ID,
      envVars: ['EBAY_APP_ID'],
    },
    {
      source: 'aliexpress',
      configured: !!(process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_SECRET_KEY),
      envVars: ['ALIEXPRESS_APP_KEY', 'ALIEXPRESS_SECRET_KEY', 'ALIEXPRESS_TRACKING_ID (optional)'],
    },
    {
      source: 'google',
      configured: !!(process.env.GOOGLE_SHOPPING_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID),
      envVars: ['GOOGLE_SHOPPING_API_KEY', 'GOOGLE_SEARCH_ENGINE_ID'],
    },
  ];
}
