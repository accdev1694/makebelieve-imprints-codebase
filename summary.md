# Technical Debt Cleanup Progress Summary

**Last Updated**: 2026-01-06

## Session: Code Duplication & Large File Cleanup

### What Was Accomplished This Session

#### 1. Created Shared Formatters (`lib/formatters.ts`) - NEW
- Centralized `formatCurrency()`, `formatDate()`, `formatDateUK()`, `formatDateTime()`, `formatDateShort()`
- Previously duplicated across 11+ files in the accounting pages

#### 2. Enhanced Tax Utilities (`lib/server/tax-utils.ts`)
- Added `TAX_YEAR_MONTHS` constant (UK tax year month list Apr-Mar)
- Added `getMonthDateRange()` function for filtering within tax years
- Deprecated inline `formatGBP()` in favor of shared formatters

#### 3. Expanded Constants (`lib/config/constants.ts`)
- Added `TAB_STATUS_MAP` for order status groupings
- Added `ARCHIVED_STATUSES` and `ACTIVE_STATUSES` for order filtering
- Updated `app/api/orders/route.ts` to use shared constants

#### 4. Refactored Accounting Pages
All pages now use shared utilities instead of inline duplicates:
- `app/admin/accounting/page.tsx` - Main dashboard
- `app/admin/accounting/expenses/page.tsx` - Expenses management
- `app/admin/accounting/income/page.tsx` - Income management
- `app/admin/accounting/reports/page.tsx` - Reports list
- `app/admin/accounting/reports/[id]/page.tsx` - Report details
- `app/admin/accounting/suppliers/page.tsx` - Supplier management

#### 5. Split CartContext (`contexts/CartContext.tsx`)
Extracted cart utilities to `lib/cart/`:
- `lib/cart/types.ts` - CartItem, AddToCartPayload, CartItemCustomization
- `lib/cart/helpers.ts` - generateCartItemId(), transformServerItem()
- `lib/cart/storage.ts` - loadCartFromStorage(), saveCartToStorage(), loadSelectionFromStorage(), saveSelectionToStorage()
- `lib/cart/index.ts` - Re-exports all utilities

CartContext reduced from ~603 lines to ~488 lines (19% reduction)

### New Files Created
- `lib/formatters.ts` (68 lines)
- `lib/cart/types.ts` (49 lines)
- `lib/cart/helpers.ts` (38 lines)
- `lib/cart/storage.ts` (100 lines)
- `lib/cart/index.ts` (9 lines)

---

## Previous Work (Completed)

### Phase 1: Quick Wins
1. **Email Infrastructure** - `lib/server/email/` with partials and templates
2. **All 21 Email Templates Migrated**
3. **Validation Expanded** (`lib/server/validation.ts`)

### Phase 2: Core Services
1. **Issue Service** (`lib/server/issue-service.ts`) - 750+ lines
2. **12 Issue Routes Migrated**
3. **Expense Service** (`lib/server/expense-service.ts`) - 1,280+ lines
4. **6 Accounting Routes Migrated**

### Phase 3: Secondary Services
- cart-service.ts, wishlist-service.ts, subscriber-service.ts

### Phase 4: Additional Services
- product-service.ts, category-service.ts, design-service.ts

---

## Remaining Tech Debt (Prioritized)

### High Priority
1. **Checkout page** (`app/checkout/page.tsx`) - 1057 lines
   - Split into CartReviewSection, ShippingSection, PaymentSection, DiscountSection

2. **AdminDataTable** (`components/admin/AdminDataTable.tsx`) - 584 lines
   - Split into folder structure with Table, Search, Pagination, Skeleton

3. **Admin Components Page** (`app/admin/components/page.tsx`) - 1542 lines
   - Use dynamic routing to split previews

### Medium Priority
4. **Order Details pages** - 350+ line components
5. **Product Service** (`lib/server/product-service.ts`) - 729 lines
6. **Wise Service** (`lib/server/wise-service.ts`) - 790 lines
7. **Product Search Service** (`lib/server/product-search-service.ts`) - 813 lines

### Remaining Duplications
- `formatCurrency` in Wise pages, recovery campaigns (different signatures)
- Modal patterns across admin pages
- Form validation logic repeated

---

## Build Status
All TypeScript compilation passes (excluding pre-existing test file issues with Jest/Vitest syntax).

## Key Files
- Formatters: `lib/formatters.ts`
- Cart utilities: `lib/cart/`
- Tax utilities: `lib/server/tax-utils.ts`
- Constants: `lib/config/constants.ts`
- Email module: `lib/server/email/`
- Services: `lib/server/*-service.ts`
