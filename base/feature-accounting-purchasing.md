# Feature: Automatic Accounting & Supplier Purchasing System

## Executive Summary

This document outlines the complete implementation of two interconnected features:

1. **Automatic Accounting Integration** - Every order, return, and cancellation automatically creates corresponding entries in the accounting system
2. **Supplier Search & Purchase System** - Search for supplies across Amazon, eBay, AliExpress, and Google Shopping, pay with Stripe Issuing virtual cards, and auto-capture all transactions as expenses

---

## Table of Contents

1. [Feature 1: Automatic Accounting Integration](#feature-1-automatic-accounting-integration)
   - [1.1 Overview](#11-overview)
   - [1.2 Database Schema Changes](#12-database-schema-changes)
   - [1.3 Accounting Service](#13-accounting-service)
   - [1.4 Webhook Integration](#14-webhook-integration)
   - [1.5 Order Status Hooks](#15-order-status-hooks)
   - [1.6 Refund & Cancellation Hooks](#16-refund--cancellation-hooks)
2. [Feature 2: Supplier Search & Purchase System](#feature-2-supplier-search--purchase-system)
   - [2.1 Overview](#21-overview)
   - [2.2 Stripe Issuing Setup](#22-stripe-issuing-setup)
   - [2.3 Database Schema](#23-database-schema)
   - [2.4 Product Search Service](#24-product-search-service)
   - [2.5 Virtual Card Management](#25-virtual-card-management)
   - [2.6 Auto-Expense Capture](#26-auto-expense-capture)
   - [2.7 Admin UI Pages](#27-admin-ui-pages)
3. [API Reference](#api-reference)
4. [Environment Variables](#environment-variables)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Checklist](#deployment-checklist)

---

## Feature 1: Automatic Accounting Integration

### 1.1 Overview

**Goal:** Automatically create accounting entries when financial events occur in the order lifecycle.

**Event → Accounting Entry Mapping:**

| Event | Trigger Point | Accounting Entry |
|-------|---------------|------------------|
| Payment Confirmed | Stripe `checkout.session.completed` webhook | Income entry (status: PENDING) |
| Order Delivered | Admin updates status to `delivered` | Income entry (status: CONFIRMED) |
| Refund Issued | Any refund route or Stripe `charge.refunded` webhook | Income reversal entry (negative amount) |
| Order Cancelled | Admin cancels with refund | Income reversal entry (negative amount) |

**Data Flow:**
```
Customer Payment
    ↓
Stripe Webhook (checkout.session.completed)
    ↓
Order Status → confirmed
    ↓
[NEW] Create Income Entry (PENDING)
    ↓
Admin marks as Delivered
    ↓
[NEW] Update Income Entry (CONFIRMED)

--- OR ---

Refund Requested
    ↓
Stripe Refund Created
    ↓
[NEW] Create Income Reversal Entry
```

### 1.2 Database Schema Changes

**File:** `frontend/prisma/schema.prisma`

```prisma
// ===========================================
// UPDATED: Income Model with Order Linking
// ===========================================

enum IncomeStatus {
  PENDING     // Payment received, not yet delivered
  CONFIRMED   // Order delivered, revenue recognized
  REVERSED    // Refunded or cancelled
}

model Income {
  id                String       @id @default(cuid())
  incomeNumber      String       @unique
  category          IncomeCategory
  description       String
  amount            Decimal      @db.Decimal(10, 2)
  currency          String       @default("GBP")
  source            String?
  customerName      String?
  incomeDate        DateTime     @default(now())
  vatAmount         Decimal?     @db.Decimal(10, 2)
  vatRate           Decimal?     @db.Decimal(5, 2)
  isVatIncluded     Boolean      @default(true)
  externalReference String?
  taxYear           String
  notes             String?      @db.Text
  receiptUrl        String?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @default(now()) @updatedAt

  // NEW: Order linking
  orderId           String?      @unique
  order             Order?       @relation(fields: [orderId], references: [id])
  status            IncomeStatus @default(PENDING)

  // NEW: Reversal tracking
  isReversal        Boolean      @default(false)
  originalIncomeId  String?
  originalIncome    Income?      @relation("IncomeReversals", fields: [originalIncomeId], references: [id])
  reversals         Income[]     @relation("IncomeReversals")
  reversalReason    String?

  @@index([category])
  @@index([source])
  @@index([incomeDate])
  @@index([taxYear])
  @@index([orderId])
  @@index([status])
}

// ===========================================
// UPDATED: Order Model with Income Relation
// ===========================================

model Order {
  // ... existing fields ...

  // NEW: Add income relation
  income            Income?
}
```

**Migration Command:**
```bash
npx prisma migrate dev --name add_income_order_linking
```

### 1.3 Accounting Service

**File:** `frontend/lib/server/accounting-service.ts`

```typescript
import prisma from '@/lib/prisma';
import { Order, IncomeCategory, IncomeStatus } from '@prisma/client';
import { getTaxYearForDate, calculateVATFromGross } from './tax-utils';

/**
 * Accounting Service
 * Handles automatic creation and management of accounting entries
 */

// Income number format: INC-YYYYMM-0001
async function generateIncomeNumber(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `INC-${yearMonth}-`;

  const lastIncome = await prisma.income.findFirst({
    where: { incomeNumber: { startsWith: prefix } },
    orderBy: { incomeNumber: 'desc' },
  });

  let nextNumber = 1;
  if (lastIncome) {
    const lastNumber = parseInt(lastIncome.incomeNumber.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Create income entry from a confirmed order
 */
export async function createIncomeFromOrder(
  order: Order & {
    customer?: { name: string; email: string } | null;
    payment?: { stripePaymentId: string | null } | null;
  },
  status: IncomeStatus = 'PENDING'
): Promise<void> {
  // Check if income already exists for this order
  const existingIncome = await prisma.income.findUnique({
    where: { orderId: order.id },
  });

  if (existingIncome) {
    console.log(`Income entry already exists for order ${order.id}`);
    return;
  }

  const incomeNumber = await generateIncomeNumber();
  const incomeDate = new Date();
  const taxYear = getTaxYearForDate(incomeDate);

  // Calculate VAT (20% included in price)
  const totalAmount = Number(order.totalPrice);
  const { vatAmount } = calculateVATFromGross(totalAmount, 20);

  await prisma.income.create({
    data: {
      incomeNumber,
      category: 'PRODUCT_SALES',
      description: `Order #${order.id.slice(0, 8).toUpperCase()}`,
      amount: totalAmount,
      currency: 'GBP',
      source: 'Online Store',
      customerName: order.customer?.name || 'Unknown Customer',
      incomeDate,
      vatAmount,
      vatRate: 20,
      isVatIncluded: true,
      externalReference: order.payment?.stripePaymentId || order.id,
      taxYear,
      orderId: order.id,
      status,
      notes: `Auto-generated from order. Customer: ${order.customer?.email || 'N/A'}`,
    },
  });

  console.log(`Income entry ${incomeNumber} created for order ${order.id} with status ${status}`);
}

/**
 * Update income status when order is delivered
 */
export async function confirmOrderIncome(orderId: string): Promise<void> {
  const income = await prisma.income.findUnique({
    where: { orderId },
  });

  if (!income) {
    console.log(`No income entry found for order ${orderId}`);
    return;
  }

  if (income.status === 'CONFIRMED') {
    console.log(`Income for order ${orderId} already confirmed`);
    return;
  }

  await prisma.income.update({
    where: { orderId },
    data: {
      status: 'CONFIRMED',
      updatedAt: new Date(),
    },
  });

  console.log(`Income entry ${income.incomeNumber} confirmed for order ${orderId}`);
}

/**
 * Create reversal entry for refund/cancellation
 */
export async function createRefundEntry(
  order: Order & {
    customer?: { name: string; email: string } | null;
    payment?: { stripePaymentId: string | null; stripeRefundId?: string | null } | null;
  },
  refundAmount: number,
  reason: string
): Promise<void> {
  // Find original income entry
  const originalIncome = await prisma.income.findUnique({
    where: { orderId: order.id },
  });

  const incomeNumber = await generateIncomeNumber();
  const incomeDate = new Date();
  const taxYear = getTaxYearForDate(incomeDate);

  // Calculate VAT on refund amount
  const { vatAmount } = calculateVATFromGross(refundAmount, 20);

  await prisma.income.create({
    data: {
      incomeNumber,
      category: 'PRODUCT_SALES',
      description: `Refund for Order #${order.id.slice(0, 8).toUpperCase()}`,
      amount: -refundAmount, // Negative amount for reversal
      currency: 'GBP',
      source: 'Online Store',
      customerName: order.customer?.name || 'Unknown Customer',
      incomeDate,
      vatAmount: vatAmount ? -vatAmount : null, // Negative VAT
      vatRate: 20,
      isVatIncluded: true,
      externalReference: order.payment?.stripeRefundId || `refund-${order.id}`,
      taxYear,
      status: 'REVERSED',
      isReversal: true,
      originalIncomeId: originalIncome?.id,
      reversalReason: reason,
      notes: `Refund reason: ${reason}. Original order: ${order.id}`,
    },
  });

  // Update original income status if exists
  if (originalIncome) {
    await prisma.income.update({
      where: { id: originalIncome.id },
      data: { status: 'REVERSED' },
    });
  }

  console.log(`Refund entry ${incomeNumber} created for order ${order.id}, amount: -£${refundAmount}`);
}

/**
 * Get income entries for an order
 */
export async function getOrderIncomeEntries(orderId: string) {
  return prisma.income.findMany({
    where: {
      OR: [
        { orderId },
        { originalIncome: { orderId } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
}

export const accountingService = {
  createIncomeFromOrder,
  confirmOrderIncome,
  createRefundEntry,
  getOrderIncomeEntries,
  generateIncomeNumber,
};
```

### 1.4 Webhook Integration

**File:** `frontend/app/api/webhooks/stripe/route.ts`

**Modifications to add after existing payment confirmation logic:**

```typescript
// Add import at top
import { accountingService } from '@/lib/server/accounting-service';

// In handleCheckoutComplete function, after line ~139 (after Payment.upsert):

// ============================================
// AUTO-ACCOUNTING: Create income entry
// ============================================
try {
  const orderWithDetails = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true } },
      payment: { select: { stripePaymentId: true } },
    },
  });

  if (orderWithDetails) {
    await accountingService.createIncomeFromOrder(orderWithDetails, 'PENDING');
  }
} catch (accountingError) {
  // Log but don't fail the webhook
  console.error('Failed to create income entry:', accountingError);
}

// In handleChargeRefunded function, after line ~270 (after order status update):

// ============================================
// AUTO-ACCOUNTING: Create refund entry
// ============================================
try {
  const orderWithDetails = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true } },
      payment: { select: { stripePaymentId: true, stripeRefundId: true } },
    },
  });

  if (orderWithDetails) {
    const refundAmount = charge.amount_refunded / 100; // Convert from cents
    await accountingService.createRefundEntry(
      orderWithDetails,
      refundAmount,
      'Stripe refund processed'
    );
  }
} catch (accountingError) {
  console.error('Failed to create refund entry:', accountingError);
}
```

### 1.5 Order Status Hooks

**File:** `frontend/app/api/orders/[id]/status/route.ts`

**Add after status update:**

```typescript
// Add import at top
import { accountingService } from '@/lib/server/accounting-service';

// After the order status update (around line 23):

// ============================================
// AUTO-ACCOUNTING: Confirm income on delivery
// ============================================
if (newStatus === 'delivered') {
  try {
    await accountingService.confirmOrderIncome(orderId);
  } catch (accountingError) {
    console.error('Failed to confirm income entry:', accountingError);
    // Don't fail the status update
  }
}
```

### 1.6 Refund & Cancellation Hooks

**Files to modify:**

#### `frontend/app/api/orders/[id]/refund/route.ts`

```typescript
// Add import
import { accountingService } from '@/lib/server/accounting-service';

// After line 180 (after successful refund transaction):

try {
  const orderWithDetails = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true } },
      payment: true,
    },
  });

  if (orderWithDetails) {
    await accountingService.createRefundEntry(
      orderWithDetails,
      Number(order.payment.amount),
      reason || 'Admin refund'
    );
  }
} catch (accountingError) {
  console.error('Failed to create refund accounting entry:', accountingError);
}
```

#### `frontend/app/api/orders/[id]/cancel/route.ts`

```typescript
// Add import
import { accountingService } from '@/lib/server/accounting-service';

// After line 152 (after successful cancellation with refund):

if (processRefund && order.payment?.status === 'COMPLETED') {
  try {
    const orderWithDetails = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true, email: true } },
        payment: true,
      },
    });

    if (orderWithDetails) {
      await accountingService.createRefundEntry(
        orderWithDetails,
        Number(order.payment.amount),
        cancellationReason || 'Order cancelled'
      );
    }
  } catch (accountingError) {
    console.error('Failed to create cancellation accounting entry:', accountingError);
  }
}
```

#### `frontend/app/api/orders/[id]/cancel-request/review/route.ts`

```typescript
// Add import
import { accountingService } from '@/lib/server/accounting-service';

// After line 147 (after approval with refund):

try {
  const orderWithDetails = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true } },
      payment: true,
    },
  });

  if (orderWithDetails) {
    await accountingService.createRefundEntry(
      orderWithDetails,
      Number(order.payment.amount),
      'Cancellation request approved'
    );
  }
} catch (accountingError) {
  console.error('Failed to create cancellation accounting entry:', accountingError);
}
```

---

## Feature 2: Supplier Search & Purchase System

### 2.1 Overview

**Goal:** Enable searching for supplies across multiple marketplaces and automatically capture purchases as expenses using Stripe Issuing virtual cards.

**System Flow:**
```
Admin searches for product (e.g., "A4 photo paper")
    ↓
System queries Amazon, eBay, AliExpress, Google Shopping APIs
    ↓
Aggregated results displayed with prices, ratings, delivery times
    ↓
Admin clicks "Buy" → Opens product page in new tab
    ↓
Admin pays using Stripe Issuing virtual card
    ↓
Stripe Issuing webhook fires (issuing_transaction.created)
    ↓
System auto-creates Expense entry with merchant details
    ↓
Expense appears in accounting dashboard
```

### 2.2 Stripe Issuing Setup

**Prerequisites:**
1. Apply for Stripe Issuing at https://dashboard.stripe.com/issuing
2. Complete business verification (KYB)
3. Wait for approval (typically 1-2 weeks)
4. Add issuing webhook endpoint

**File:** `frontend/lib/server/stripe-issuing-service.ts`

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Stripe Issuing Service
 * Manages virtual cards for supplier purchases
 */

export interface CardholderData {
  name: string;
  email: string;
  phone?: string;
  address: {
    line1: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

/**
 * Create a cardholder (required before creating cards)
 */
export async function createCardholder(data: CardholderData): Promise<Stripe.Issuing.Cardholder> {
  return stripe.issuing.cardholders.create({
    name: data.name,
    email: data.email,
    phone_number: data.phone,
    type: 'individual',
    billing: {
      address: {
        line1: data.address.line1,
        city: data.address.city,
        state: data.address.state,
        postal_code: data.address.postalCode,
        country: data.address.country,
      },
    },
  });
}

/**
 * Create a virtual card for a cardholder
 */
export async function createVirtualCard(
  cardholderId: string,
  spendingLimit: number,
  currency: string = 'gbp'
): Promise<Stripe.Issuing.Card> {
  return stripe.issuing.cards.create({
    cardholder: cardholderId,
    currency,
    type: 'virtual',
    spending_controls: {
      spending_limits: [
        {
          amount: Math.round(spendingLimit * 100), // Convert to pence
          interval: 'per_authorization',
        },
      ],
      allowed_categories: [
        'office_and_commercial_furniture',
        'computers_peripherals_and_software',
        'office_supplies',
        'printing_and_publishing',
        'photographic_studios',
        'miscellaneous_general_merchandise',
        'direct_marketing_combination_catalog_and_retail_merchant',
        'direct_marketing_catalog_merchant',
        'direct_marketing_other',
      ],
    },
  });
}

/**
 * List all cards
 */
export async function listCards(limit: number = 100): Promise<Stripe.Issuing.Card[]> {
  const response = await stripe.issuing.cards.list({ limit });
  return response.data;
}

/**
 * Get card details including sensitive info
 */
export async function getCardDetails(cardId: string): Promise<{
  card: Stripe.Issuing.Card;
  number?: string;
  cvc?: string;
}> {
  const card = await stripe.issuing.cards.retrieve(cardId);

  // Only retrieve sensitive details if card is active
  if (card.status === 'active') {
    const details = await stripe.issuing.cards.retrieve(cardId, {
      expand: ['number', 'cvc'],
    });
    return {
      card: details,
      number: (details as any).number,
      cvc: (details as any).cvc,
    };
  }

  return { card };
}

/**
 * Update card status (freeze/unfreeze)
 */
export async function updateCardStatus(
  cardId: string,
  status: 'active' | 'inactive' | 'canceled'
): Promise<Stripe.Issuing.Card> {
  return stripe.issuing.cards.update(cardId, { status });
}

/**
 * List transactions for a card
 */
export async function listCardTransactions(
  cardId: string,
  limit: number = 100
): Promise<Stripe.Issuing.Transaction[]> {
  const response = await stripe.issuing.transactions.list({
    card: cardId,
    limit,
  });
  return response.data;
}

/**
 * Get authorization details
 */
export async function getAuthorization(
  authorizationId: string
): Promise<Stripe.Issuing.Authorization> {
  return stripe.issuing.authorizations.retrieve(authorizationId);
}

/**
 * Map Stripe MCC to expense category
 */
export function mapMCCToExpenseCategory(mcc: string): string {
  const mccMap: Record<string, string> = {
    // Office & Supplies
    '5943': 'MATERIALS',      // Stationery stores
    '5111': 'MATERIALS',      // Stationery/office supplies
    '5044': 'EQUIPMENT',      // Office equipment

    // Computers & Electronics
    '5734': 'EQUIPMENT',      // Computer software stores
    '5732': 'EQUIPMENT',      // Electronics stores
    '5045': 'EQUIPMENT',      // Computers/peripherals

    // Shipping & Packaging
    '4215': 'SHIPPING_SUPPLIES', // Courier services
    '5099': 'PACKAGING',      // Durable goods

    // Printing
    '2741': 'MATERIALS',      // Publishing/printing
    '7338': 'MATERIALS',      // Quick copy/repro

    // General Merchandise
    '5311': 'MATERIALS',      // Department stores
    '5399': 'MATERIALS',      // Misc general merchandise
    '5999': 'OTHER',          // Miscellaneous retail

    // Online Marketplaces
    '5262': 'MATERIALS',      // Marketplaces
    '5964': 'MATERIALS',      // Direct marketing - catalog
    '5969': 'MATERIALS',      // Direct marketing - other
  };

  return mccMap[mcc] || 'OTHER';
}

export const stripeIssuingService = {
  createCardholder,
  createVirtualCard,
  listCards,
  getCardDetails,
  updateCardStatus,
  listCardTransactions,
  getAuthorization,
  mapMCCToExpenseCategory,
};
```

### 2.3 Database Schema

**File:** `frontend/prisma/schema.prisma`

```prisma
// ===========================================
// NEW: Virtual Card Management
// ===========================================

enum CardStatus {
  ACTIVE
  FROZEN
  CANCELLED
}

model VirtualCard {
  id                String   @id @default(cuid())
  stripeCardId      String   @unique
  stripeCardholderId String
  name              String   // Card nickname (e.g., "Main Purchasing Card")
  last4             String
  expiryMonth       Int
  expiryYear        Int
  brand             String   @default("Visa")
  spendingLimit     Decimal  @db.Decimal(10, 2)
  status            CardStatus @default(ACTIVE)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @default(now()) @updatedAt
  createdBy         String   // Admin user ID who created the card

  transactions      SupplierTransaction[]

  @@index([status])
  @@index([createdBy])
}

// ===========================================
// NEW: Supplier Transaction Tracking
// ===========================================

enum TransactionStatus {
  PENDING           // Authorization received
  APPROVED          // Transaction approved
  DECLINED          // Transaction declined
  COMPLETED         // Transaction settled
  REFUNDED          // Transaction refunded
}

model SupplierTransaction {
  id                String   @id @default(cuid())
  cardId            String
  stripeAuthId      String   @unique  // Stripe authorization ID
  stripeTransId     String?  @unique  // Stripe transaction ID (after settlement)

  // Merchant details
  merchantName      String
  merchantCategory  String?  // MCC code
  merchantCity      String?
  merchantCountry   String?

  // Transaction details
  amount            Decimal  @db.Decimal(10, 2)
  currency          String   @default("GBP")
  status            TransactionStatus @default(PENDING)

  // Product context (from search)
  productSearched   Json?    // { title, url, source, searchQuery }

  // Expense linking
  expenseId         String?  @unique

  // Timestamps
  authorizedAt      DateTime @default(now())
  settledAt         DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @default(now()) @updatedAt

  // Relations
  card              VirtualCard @relation(fields: [cardId], references: [id])
  expense           Expense?    @relation(fields: [expenseId], references: [id])

  @@index([cardId])
  @@index([status])
  @@index([merchantName])
  @@index([authorizedAt])
}

// ===========================================
// NEW: Product Search Cache
// ===========================================

model ProductSearchCache {
  id          String   @id @default(cuid())
  query       String
  source      String   // amazon, ebay, aliexpress, google
  results     Json     // Cached search results
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  @@unique([query, source])
  @@index([expiresAt])
}

// ===========================================
// NEW: Saved Products (Wishlist)
// ===========================================

model SavedProduct {
  id          String   @id @default(cuid())
  userId      String   // Admin who saved it
  source      String   // amazon, ebay, etc.
  externalId  String   // Product ID on external platform
  title       String
  price       Decimal  @db.Decimal(10, 2)
  currency    String   @default("GBP")
  url         String
  imageUrl    String?
  notes       String?  @db.Text
  createdAt   DateTime @default(now())

  @@unique([userId, source, externalId])
  @@index([userId])
}

// ===========================================
// UPDATED: Expense Model with Transaction Link
// ===========================================

model Expense {
  // ... existing fields ...

  // NEW: Supplier transaction link
  supplierTransaction SupplierTransaction?
}
```

### 2.4 Product Search Service

**File:** `frontend/lib/server/product-search-service.ts`

```typescript
import prisma from '@/lib/prisma';

/**
 * Product Search Service
 * Aggregates product searches across multiple marketplaces
 */

export interface ProductResult {
  id: string;
  source: 'amazon' | 'ebay' | 'aliexpress' | 'google';
  title: string;
  price: number;
  currency: string;
  url: string;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  seller: string | null;
  deliveryEstimate: string | null;
  isPrime?: boolean;
  isFreeShipping?: boolean;
}

export interface SearchOptions {
  sources?: ('amazon' | 'ebay' | 'aliexpress' | 'google')[];
  maxResults?: number;
  sortBy?: 'price' | 'rating' | 'relevance';
  minPrice?: number;
  maxPrice?: number;
}

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// ===========================================
// AMAZON PRODUCT ADVERTISING API
// ===========================================

async function searchAmazon(query: string, maxResults: number = 10): Promise<ProductResult[]> {
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;

  if (!accessKey || !secretKey || !partnerTag) {
    console.warn('Amazon API credentials not configured');
    return [];
  }

  try {
    // Amazon PA-API 5.0 requires AWS Signature Version 4
    // Using amazon-paapi library for signing
    const amazonPaapi = require('amazon-paapi');

    const commonParameters = {
      AccessKey: accessKey,
      SecretKey: secretKey,
      PartnerTag: partnerTag,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.co.uk',
    };

    const response = await amazonPaapi.SearchItems(commonParameters, {
      Keywords: query,
      SearchIndex: 'All',
      ItemCount: maxResults,
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'Offers.Listings.Price',
        'Offers.Listings.DeliveryInfo.IsPrimeEligible',
        'CustomerReviews.Count',
        'CustomerReviews.StarRating',
      ],
    });

    return (response.SearchResult?.Items || []).map((item: any) => ({
      id: item.ASIN,
      source: 'amazon' as const,
      title: item.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
      price: item.Offers?.Listings?.[0]?.Price?.Amount || 0,
      currency: 'GBP',
      url: item.DetailPageURL,
      imageUrl: item.Images?.Primary?.Large?.URL || null,
      rating: item.CustomerReviews?.StarRating?.Value || null,
      reviewCount: item.CustomerReviews?.Count || null,
      seller: 'Amazon',
      deliveryEstimate: item.Offers?.Listings?.[0]?.DeliveryInfo?.IsPrimeEligible
        ? 'Prime - Next Day'
        : '3-5 days',
      isPrime: item.Offers?.Listings?.[0]?.DeliveryInfo?.IsPrimeEligible || false,
    }));
  } catch (error) {
    console.error('Amazon search error:', error);
    return [];
  }
}

// ===========================================
// EBAY BROWSE API
// ===========================================

async function searchEbay(query: string, maxResults: number = 10): Promise<ProductResult[]> {
  const appId = process.env.EBAY_APP_ID;

  if (!appId) {
    console.warn('eBay API credentials not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?` +
      new URLSearchParams({
        q: query,
        limit: String(maxResults),
        filter: 'deliveryCountry:GB',
      }),
      {
        headers: {
          'Authorization': `Bearer ${appId}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
        },
      }
    );

    const data = await response.json();

    return (data.itemSummaries || []).map((item: any) => ({
      id: item.itemId,
      source: 'ebay' as const,
      title: item.title,
      price: parseFloat(item.price?.value || '0'),
      currency: item.price?.currency || 'GBP',
      url: item.itemWebUrl,
      imageUrl: item.image?.imageUrl || null,
      rating: item.seller?.feedbackScore ? (item.seller.feedbackScore / 20) : null,
      reviewCount: item.seller?.feedbackScore || null,
      seller: item.seller?.username || null,
      deliveryEstimate: item.shippingOptions?.[0]?.minEstimatedDeliveryDate || null,
      isFreeShipping: item.shippingOptions?.[0]?.shippingCostType === 'FREE',
    }));
  } catch (error) {
    console.error('eBay search error:', error);
    return [];
  }
}

// ===========================================
// ALIEXPRESS AFFILIATE API
// ===========================================

async function searchAliExpress(query: string, maxResults: number = 10): Promise<ProductResult[]> {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const secretKey = process.env.ALIEXPRESS_SECRET_KEY;

  if (!appKey || !secretKey) {
    console.warn('AliExpress API credentials not configured');
    return [];
  }

  try {
    // AliExpress API implementation
    // Note: Requires TOP SDK or direct API calls with signature
    const response = await fetch(
      'https://api-sg.aliexpress.com/sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          app_key: appKey,
          method: 'aliexpress.affiliate.product.query',
          keywords: query,
          target_currency: 'GBP',
          target_language: 'EN',
          page_size: String(maxResults),
          ship_to_country: 'UK',
        }),
      }
    );

    const data = await response.json();
    const products = data.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product || [];

    return products.map((item: any) => ({
      id: item.product_id,
      source: 'aliexpress' as const,
      title: item.product_title,
      price: parseFloat(item.target_sale_price || item.target_original_price || '0'),
      currency: 'GBP',
      url: item.promotion_link || item.product_detail_url,
      imageUrl: item.product_main_image_url || null,
      rating: parseFloat(item.evaluate_rate || '0') / 20,
      reviewCount: parseInt(item.lastest_volume || '0'),
      seller: 'AliExpress Seller',
      deliveryEstimate: '15-30 days',
      isFreeShipping: item.ship_to_days?.includes('Free') || false,
    }));
  } catch (error) {
    console.error('AliExpress search error:', error);
    return [];
  }
}

// ===========================================
// GOOGLE SHOPPING API
// ===========================================

async function searchGoogle(query: string, maxResults: number = 10): Promise<ProductResult[]> {
  const apiKey = process.env.GOOGLE_SHOPPING_API_KEY;

  if (!apiKey) {
    console.warn('Google Shopping API credentials not configured');
    return [];
  }

  try {
    // Using Google Custom Search API with Shopping results
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?` +
      new URLSearchParams({
        key: apiKey,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID || '',
        q: query,
        num: String(maxResults),
        tbm: 'shop',
        gl: 'uk',
      })
    );

    const data = await response.json();

    return (data.items || []).map((item: any) => ({
      id: item.cacheId || item.link,
      source: 'google' as const,
      title: item.title,
      price: parseFloat(item.pagemap?.offer?.[0]?.price || '0'),
      currency: 'GBP',
      url: item.link,
      imageUrl: item.pagemap?.cse_image?.[0]?.src || null,
      rating: parseFloat(item.pagemap?.aggregaterating?.[0]?.ratingvalue || '0'),
      reviewCount: parseInt(item.pagemap?.aggregaterating?.[0]?.reviewcount || '0'),
      seller: item.displayLink,
      deliveryEstimate: null,
    }));
  } catch (error) {
    console.error('Google Shopping search error:', error);
    return [];
  }
}

// ===========================================
// AGGREGATED SEARCH
// ===========================================

export async function searchProducts(
  query: string,
  options: SearchOptions = {}
): Promise<ProductResult[]> {
  const {
    sources = ['amazon', 'ebay', 'aliexpress', 'google'],
    maxResults = 10,
    sortBy = 'relevance',
    minPrice,
    maxPrice,
  } = options;

  // Check cache first
  const cacheKey = `${query}-${sources.join(',')}-${maxResults}`;
  const cached = await prisma.productSearchCache.findFirst({
    where: {
      query: cacheKey,
      expiresAt: { gt: new Date() },
    },
  });

  if (cached) {
    return cached.results as ProductResult[];
  }

  // Search all sources in parallel
  const searchPromises: Promise<ProductResult[]>[] = [];

  if (sources.includes('amazon')) {
    searchPromises.push(searchAmazon(query, maxResults));
  }
  if (sources.includes('ebay')) {
    searchPromises.push(searchEbay(query, maxResults));
  }
  if (sources.includes('aliexpress')) {
    searchPromises.push(searchAliExpress(query, maxResults));
  }
  if (sources.includes('google')) {
    searchPromises.push(searchGoogle(query, maxResults));
  }

  const results = await Promise.all(searchPromises);
  let allProducts = results.flat();

  // Apply price filters
  if (minPrice !== undefined) {
    allProducts = allProducts.filter(p => p.price >= minPrice);
  }
  if (maxPrice !== undefined) {
    allProducts = allProducts.filter(p => p.price <= maxPrice);
  }

  // Sort results
  switch (sortBy) {
    case 'price':
      allProducts.sort((a, b) => a.price - b.price);
      break;
    case 'rating':
      allProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'relevance':
    default:
      // Keep original order (relevance from each source)
      break;
  }

  // Cache results
  await prisma.productSearchCache.upsert({
    where: { query_source: { query: cacheKey, source: 'aggregated' } },
    create: {
      query: cacheKey,
      source: 'aggregated',
      results: allProducts,
      expiresAt: new Date(Date.now() + CACHE_DURATION_MS),
    },
    update: {
      results: allProducts,
      expiresAt: new Date(Date.now() + CACHE_DURATION_MS),
    },
  });

  return allProducts;
}

// ===========================================
// SAVED PRODUCTS (WISHLIST)
// ===========================================

export async function saveProduct(
  userId: string,
  product: ProductResult,
  notes?: string
): Promise<void> {
  await prisma.savedProduct.upsert({
    where: {
      userId_source_externalId: {
        userId,
        source: product.source,
        externalId: product.id,
      },
    },
    create: {
      userId,
      source: product.source,
      externalId: product.id,
      title: product.title,
      price: product.price,
      currency: product.currency,
      url: product.url,
      imageUrl: product.imageUrl,
      notes,
    },
    update: {
      price: product.price,
      notes,
    },
  });
}

export async function getSavedProducts(userId: string): Promise<any[]> {
  return prisma.savedProduct.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function removeSavedProduct(userId: string, id: string): Promise<void> {
  await prisma.savedProduct.delete({
    where: { id, userId },
  });
}

export const productSearchService = {
  searchProducts,
  searchAmazon,
  searchEbay,
  searchAliExpress,
  searchGoogle,
  saveProduct,
  getSavedProducts,
  removeSavedProduct,
};
```

### 2.5 Virtual Card Management

**File:** `frontend/app/api/admin/purchasing/cards/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { stripeIssuingService } from '@/lib/server/stripe-issuing-service';

/**
 * GET /api/admin/purchasing/cards
 * List all virtual cards
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const cards = await prisma.virtualCard.findMany({
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get spending totals for each card
    const cardsWithTotals = await Promise.all(
      cards.map(async (card) => {
        const spending = await prisma.supplierTransaction.aggregate({
          where: {
            cardId: card.id,
            status: { in: ['APPROVED', 'COMPLETED'] },
          },
          _sum: { amount: true },
        });

        return {
          ...card,
          totalSpent: spending._sum.amount || 0,
          transactionCount: card._count.transactions,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: { cards: cardsWithTotals },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/purchasing/cards
 * Create a new virtual card
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const body = await request.json();

    const { name, spendingLimit } = body;

    if (!name || !spendingLimit) {
      return NextResponse.json(
        { error: 'Name and spending limit are required' },
        { status: 400 }
      );
    }

    // Check if cardholder exists, create if not
    let cardholderId = await prisma.virtualCard.findFirst({
      select: { stripeCardholderId: true },
    }).then(c => c?.stripeCardholderId);

    if (!cardholderId) {
      // Create cardholder with business details
      const cardholder = await stripeIssuingService.createCardholder({
        name: 'MakeBelieve Imprints',
        email: user.email!,
        address: {
          line1: process.env.BUSINESS_ADDRESS_LINE1 || '123 Business Street',
          city: process.env.BUSINESS_CITY || 'London',
          postalCode: process.env.BUSINESS_POSTCODE || 'SW1A 1AA',
          country: 'GB',
        },
      });
      cardholderId = cardholder.id;
    }

    // Create virtual card in Stripe
    const stripeCard = await stripeIssuingService.createVirtualCard(
      cardholderId,
      spendingLimit
    );

    // Store card in database
    const card = await prisma.virtualCard.create({
      data: {
        stripeCardId: stripeCard.id,
        stripeCardholderId: cardholderId,
        name,
        last4: stripeCard.last4,
        expiryMonth: stripeCard.exp_month,
        expiryYear: stripeCard.exp_year,
        brand: stripeCard.brand || 'Visa',
        spendingLimit,
        status: 'ACTIVE',
        createdBy: user.userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: { card },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

**File:** `frontend/app/api/admin/purchasing/cards/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { stripeIssuingService } from '@/lib/server/stripe-issuing-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/purchasing/cards/[id]
 * Get card details including sensitive info
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { id } = await params;

    const card = await prisma.virtualCard.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { authorizedAt: 'desc' },
          take: 20,
          include: { expense: true },
        },
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Get card details from Stripe (includes number and CVC if active)
    let stripeDetails = null;
    if (card.status === 'ACTIVE') {
      stripeDetails = await stripeIssuingService.getCardDetails(card.stripeCardId);
    }

    return NextResponse.json({
      success: true,
      data: {
        card,
        stripeDetails: stripeDetails ? {
          number: stripeDetails.number,
          cvc: stripeDetails.cvc,
        } : null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/purchasing/cards/[id]
 * Update card (freeze/unfreeze/cancel)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const { action } = body; // 'freeze', 'unfreeze', 'cancel'

    const card = await prisma.virtualCard.findUnique({
      where: { id },
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    let newStatus: 'active' | 'inactive' | 'canceled';
    let dbStatus: 'ACTIVE' | 'FROZEN' | 'CANCELLED';

    switch (action) {
      case 'freeze':
        newStatus = 'inactive';
        dbStatus = 'FROZEN';
        break;
      case 'unfreeze':
        newStatus = 'active';
        dbStatus = 'ACTIVE';
        break;
      case 'cancel':
        newStatus = 'canceled';
        dbStatus = 'CANCELLED';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update in Stripe
    await stripeIssuingService.updateCardStatus(card.stripeCardId, newStatus);

    // Update in database
    const updatedCard = await prisma.virtualCard.update({
      where: { id },
      data: { status: dbStatus },
    });

    return NextResponse.json({
      success: true,
      data: { card: updatedCard },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 2.6 Auto-Expense Capture

**File:** `frontend/app/api/webhooks/stripe-issuing/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { stripeIssuingService } from '@/lib/server/stripe-issuing-service';
import { getTaxYearForDate } from '@/lib/server/tax-utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_ISSUING_WEBHOOK_SECRET!;

/**
 * POST /api/webhooks/stripe-issuing
 * Handle Stripe Issuing webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'issuing_authorization.created':
        await handleAuthorizationCreated(event.data.object as Stripe.Issuing.Authorization);
        break;

      case 'issuing_authorization.updated':
        await handleAuthorizationUpdated(event.data.object as Stripe.Issuing.Authorization);
        break;

      case 'issuing_transaction.created':
        await handleTransactionCreated(event.data.object as Stripe.Issuing.Transaction);
        break;

      default:
        console.log(`Unhandled issuing event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle new authorization (transaction pending)
 */
async function handleAuthorizationCreated(authorization: Stripe.Issuing.Authorization) {
  console.log(`Authorization created: ${authorization.id}`);

  // Find the card in our database
  const card = await prisma.virtualCard.findUnique({
    where: { stripeCardId: authorization.card.id },
  });

  if (!card) {
    console.error(`Card not found for authorization: ${authorization.card.id}`);
    return;
  }

  // Create pending transaction record
  await prisma.supplierTransaction.create({
    data: {
      cardId: card.id,
      stripeAuthId: authorization.id,
      merchantName: authorization.merchant_data.name || 'Unknown Merchant',
      merchantCategory: authorization.merchant_data.category_code,
      merchantCity: authorization.merchant_data.city,
      merchantCountry: authorization.merchant_data.country,
      amount: authorization.amount / 100, // Convert from pence
      currency: authorization.currency.toUpperCase(),
      status: 'PENDING',
      authorizedAt: new Date(authorization.created * 1000),
    },
  });
}

/**
 * Handle authorization update (approved/declined)
 */
async function handleAuthorizationUpdated(authorization: Stripe.Issuing.Authorization) {
  console.log(`Authorization updated: ${authorization.id}, status: ${authorization.status}`);

  const status = authorization.status === 'closed'
    ? (authorization.approved ? 'APPROVED' : 'DECLINED')
    : 'PENDING';

  await prisma.supplierTransaction.update({
    where: { stripeAuthId: authorization.id },
    data: { status },
  });
}

/**
 * Handle transaction created (settled) - AUTO-CREATE EXPENSE
 */
async function handleTransactionCreated(transaction: Stripe.Issuing.Transaction) {
  console.log(`Transaction created: ${transaction.id}`);

  // Find the pending transaction
  const supplierTx = await prisma.supplierTransaction.findFirst({
    where: { stripeAuthId: transaction.authorization as string },
    include: { card: true },
  });

  if (!supplierTx) {
    console.error(`No pending transaction found for: ${transaction.authorization}`);
    return;
  }

  // Map merchant category to expense category
  const expenseCategory = stripeIssuingService.mapMCCToExpenseCategory(
    transaction.merchant_data.category_code || ''
  );

  const transactionDate = new Date(transaction.created * 1000);
  const taxYear = getTaxYearForDate(transactionDate);
  const amount = Math.abs(transaction.amount) / 100; // Convert from pence, make positive

  // Generate expense number
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `EXP-${yearMonth}-`;

  const lastExpense = await prisma.expense.findFirst({
    where: { expenseNumber: { startsWith: prefix } },
    orderBy: { expenseNumber: 'desc' },
  });

  let nextNumber = 1;
  if (lastExpense) {
    const lastNum = parseInt(lastExpense.expenseNumber.split('-')[2], 10);
    nextNumber = lastNum + 1;
  }
  const expenseNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;

  // Calculate VAT (assume 20% standard rate, can be adjusted later)
  const vatRate = 20;
  const vatAmount = (amount * vatRate) / (100 + vatRate);

  // Create expense entry
  const expense = await prisma.expense.create({
    data: {
      expenseNumber,
      category: expenseCategory as any,
      description: `Purchase from ${transaction.merchant_data.name}`,
      amount,
      currency: transaction.currency.toUpperCase(),
      purchaseDate: transactionDate,
      vatAmount,
      vatRate,
      isVatReclaimable: true,
      externalReference: transaction.id,
      taxYear,
      importSource: 'STRIPE_ISSUING',
      notes: `Auto-captured from Stripe Issuing.
Merchant: ${transaction.merchant_data.name}
Category: ${transaction.merchant_data.category} (${transaction.merchant_data.category_code})
Location: ${transaction.merchant_data.city}, ${transaction.merchant_data.country}
Card: ****${supplierTx.card.last4}`,
    },
  });

  // Update supplier transaction
  await prisma.supplierTransaction.update({
    where: { id: supplierTx.id },
    data: {
      stripeTransId: transaction.id,
      status: 'COMPLETED',
      expenseId: expense.id,
      settledAt: transactionDate,
    },
  });

  console.log(`Auto-created expense ${expenseNumber} for transaction ${transaction.id}`);
}
```

### 2.7 Admin UI Pages

**File:** `frontend/app/admin/purchasing/page.tsx`

```typescript
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Search, CreditCard, Receipt, BookmarkPlus } from 'lucide-react';

function PurchasingDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                ← Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Supplier Purchasing</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Search Products */}
          <Link href="/admin/purchasing/search">
            <Card className="card-glow hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
              <CardHeader>
                <Search className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Search Products</CardTitle>
                <CardDescription>
                  Search Amazon, eBay, AliExpress, and more
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Virtual Cards */}
          <Link href="/admin/purchasing/cards">
            <Card className="card-glow hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
              <CardHeader>
                <CreditCard className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Virtual Cards</CardTitle>
                <CardDescription>
                  Manage Stripe Issuing virtual cards
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Transactions */}
          <Link href="/admin/purchasing/transactions">
            <Card className="card-glow hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
              <CardHeader>
                <Receipt className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Transactions</CardTitle>
                <CardDescription>
                  View all supplier purchases
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Saved Products */}
          <Link href="/admin/purchasing/saved">
            <Card className="card-glow hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
              <CardHeader>
                <BookmarkPlus className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Saved Products</CardTitle>
                <CardDescription>
                  Your product wishlist
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function PurchasingPage() {
  return (
    <ProtectedRoute adminOnly>
      <PurchasingDashboard />
    </ProtectedRoute>
  );
}
```

---

## API Reference

### Accounting APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/accounting/income` | List income entries with filtering |
| POST | `/api/admin/accounting/income` | Create income entry |
| GET | `/api/admin/accounting/income/[id]` | Get income entry details |
| PUT | `/api/admin/accounting/income/[id]` | Update income entry |
| DELETE | `/api/admin/accounting/income/[id]` | Delete income entry |

### Purchasing APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/purchasing/search` | Search products across marketplaces |
| GET | `/api/admin/purchasing/cards` | List virtual cards |
| POST | `/api/admin/purchasing/cards` | Create virtual card |
| GET | `/api/admin/purchasing/cards/[id]` | Get card details with number/CVC |
| PUT | `/api/admin/purchasing/cards/[id]` | Freeze/unfreeze/cancel card |
| GET | `/api/admin/purchasing/transactions` | List supplier transactions |
| POST | `/api/admin/purchasing/saved` | Save product to wishlist |
| GET | `/api/admin/purchasing/saved` | Get saved products |
| DELETE | `/api/admin/purchasing/saved/[id]` | Remove saved product |

### Webhooks

| Endpoint | Source | Events |
|----------|--------|--------|
| `/api/webhooks/stripe` | Stripe Payments | `checkout.session.completed`, `charge.refunded` |
| `/api/webhooks/stripe-issuing` | Stripe Issuing | `issuing_authorization.*`, `issuing_transaction.created` |

---

## Environment Variables

```env
# Existing Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# NEW: Stripe Issuing
STRIPE_ISSUING_WEBHOOK_SECRET=whsec_issuing_xxxxx

# NEW: Business Details (for cardholder)
BUSINESS_ADDRESS_LINE1="Your Business Address"
BUSINESS_CITY="London"
BUSINESS_POSTCODE="SW1A 1AA"

# NEW: Product Search APIs
AMAZON_ACCESS_KEY=AKIAXXXXXXXX
AMAZON_SECRET_KEY=xxxxxxxx
AMAZON_PARTNER_TAG=yourtag-21

EBAY_APP_ID=your-ebay-app-id

ALIEXPRESS_APP_KEY=your-aliexpress-key
ALIEXPRESS_SECRET_KEY=your-aliexpress-secret

GOOGLE_SHOPPING_API_KEY=your-google-api-key
GOOGLE_SEARCH_ENGINE_ID=your-cse-id
```

---

## Testing Strategy

### Unit Tests

1. **Accounting Service Tests**
   - `createIncomeFromOrder()` creates correct entry
   - `confirmOrderIncome()` updates status
   - `createRefundEntry()` creates negative entry and links to original
   - Duplicate prevention works

2. **Stripe Issuing Service Tests**
   - Card creation with spending limits
   - MCC to category mapping
   - Card status updates

3. **Product Search Service Tests**
   - Each source returns correct format
   - Cache works correctly
   - Error handling for API failures

### Integration Tests

1. **Order → Income Flow**
   - Place order → confirm payment → verify income entry created
   - Deliver order → verify income status updated
   - Refund order → verify reversal entry created

2. **Card Transaction → Expense Flow**
   - Create virtual card
   - Simulate authorization webhook
   - Simulate transaction webhook
   - Verify expense auto-created

### E2E Tests

1. Complete order flow with accounting
2. Product search and save to wishlist
3. Virtual card management UI

---

## Deployment Checklist

### Pre-Deployment

- [ ] Apply for Stripe Issuing (if not already approved)
- [ ] Obtain API keys for Amazon, eBay, AliExpress, Google
- [ ] Configure all environment variables
- [ ] Run database migrations
- [ ] Deploy webhook endpoints

### Stripe Dashboard Setup

- [ ] Enable Stripe Issuing in dashboard
- [ ] Configure Issuing webhook endpoint
- [ ] Set spending controls and limits
- [ ] Test with Stripe test mode first

### Post-Deployment

- [ ] Verify webhooks receiving events
- [ ] Test complete order → income flow
- [ ] Test complete purchase → expense flow
- [ ] Monitor for errors in logs
- [ ] Verify accounting entries appear correctly

---

## Security Considerations

1. **Card Details** - Never log full card numbers, only last 4 digits
2. **Webhook Verification** - Always verify Stripe signatures
3. **Admin Only** - All purchasing features require admin authentication
4. **Rate Limiting** - Implement rate limits on search APIs
5. **Audit Trail** - Log all card creations and status changes

---

## Future Enhancements

1. **Receipt Scanning** - OCR to extract purchase details
2. **Budget Tracking** - Set monthly budgets per category
3. **Approval Workflow** - Require approval for purchases over threshold
4. **Supplier Ratings** - Track and rate suppliers
5. **Purchase Orders** - Formal PO system before purchase
6. **Multi-Currency** - Handle USD/EUR purchases with conversion
