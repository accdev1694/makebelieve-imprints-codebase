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
 * Search Amazon Product Advertising API
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
    // Amazon PA-API 5.0 requires request signing
    // This is a simplified implementation - production would use aws4 signing
    const endpoint = 'https://webservices.amazon.co.uk/paapi5/searchitems';

    const requestBody = {
      PartnerTag: partnerTag,
      PartnerType: 'Associates',
      Keywords: query,
      SearchIndex: 'All',
      ItemCount: limit,
      Resources: [
        'ItemInfo.Title',
        'Offers.Listings.Price',
        'Images.Primary.Large',
        'ItemInfo.ByLineInfo',
      ],
    };

    // Note: Full implementation requires AWS Signature Version 4
    // For now, return empty array if not properly configured
    console.log('Amazon search requires AWS signature implementation');
    return [];

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
 */
async function searchAliExpress(query: string, limit: number = 10): Promise<ProductSearchResult[]> {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const secretKey = process.env.ALIEXPRESS_SECRET_KEY;

  if (!appKey || !secretKey) {
    console.log('AliExpress API not configured');
    return [];
  }

  try {
    // AliExpress Affiliate API
    const endpoint = 'https://api.aliexpress.com/sync';

    const params = new URLSearchParams({
      app_key: appKey,
      method: 'aliexpress.affiliate.product.query',
      keywords: query,
      page_size: limit.toString(),
      target_currency: 'GBP',
      target_language: 'EN',
      ship_to_country: 'UK',
    });

    // Note: Full implementation requires request signing
    console.log('AliExpress search requires API signature implementation');
    return [];

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
      envVars: ['ALIEXPRESS_APP_KEY', 'ALIEXPRESS_SECRET_KEY'],
    },
    {
      source: 'google',
      configured: !!(process.env.GOOGLE_SHOPPING_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID),
      envVars: ['GOOGLE_SHOPPING_API_KEY', 'GOOGLE_SEARCH_ENGINE_ID'],
    },
  ];
}
