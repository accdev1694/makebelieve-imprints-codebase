# CI Build Failure Analysis

## Problem Summary

The CI build fails on Ubuntu (GitHub Actions) but succeeds locally on Windows. The error is:

```
Build error occurred
[Error: Failed to collect page data for /api/admin/accounting/expenses/[id]] {
  type: 'Error'
}
```

This is a Next.js build-time error that occurs during static analysis of API routes.

## Environment

- **CI**: Ubuntu (GitHub Actions), Node.js 22
- **Local**: Windows, Node.js 24.5.0
- **Framework**: Next.js 15 (App Router)
- **Database**: Prisma with Neon PostgreSQL

## CI Workflow

The build step runs:
```yaml
- name: Build frontend
  working-directory: frontend
  run: npm run build
  env:
    DATABASE_URL: "postgresql://placeholder:placeholder@localhost:5432/placeholder"
    JWT_SECRET: "ci-build-secret-not-real"
    NEXT_PUBLIC_API_URL: "http://localhost:3000"
```

Build command: `prisma generate && next build`

## Fixes Attempted

### 1. Removed non-existent backend workspace ✅
**File**: `package.json`
**Issue**: Root package.json referenced a `backend` workspace that doesn't exist
**Fix**: Removed backend from workspaces array and updated scripts
**Result**: Fixed lint/type check CI jobs

### 2. Excluded test files from TypeScript checking ✅
**File**: `frontend/tsconfig.json`
**Issue**: Test files using edge runtime Jest types conflicted with standard Jest types
**Fix**: Added `"**/__tests__/**"` to exclude array
**Result**: Fixed TypeScript CI job

### 3. Fixed Jest test path ignore patterns ✅
**File**: `frontend/jest.config.js`
**Issue**: Test helper utilities were being run as tests
**Fix**: Added `__tests__/helpers/` to testPathIgnorePatterns
**Result**: Fixed unit tests CI job

### 4. Simplified Prisma client initialization ❌
**File**: `frontend/lib/prisma.ts`
**Issue**: Suspected `@prisma/adapter-neon` import causing platform-specific issues
**Fix**: Removed Neon adapter, use standard PrismaClient
**Result**: Did NOT fix the build error

### 5. Removed Decimal import from internal Prisma path ❌
**File**: `frontend/lib/server/accounting-service.ts`
**Issue**: `import { Decimal } from '@prisma/client/runtime/library'` - internal path may not resolve on all platforms
**Fix**: Removed Decimal import, Prisma accepts plain numbers for Decimal fields
**Result**: Did NOT fix the build error

### 6. Used dynamic imports in the failing route ❓
**File**: `frontend/app/api/admin/accounting/expenses/[id]/route.ts`
**Issue**: Static imports of expense-service analyzed at build time
**Fix**: Changed to `await import('@/lib/server/expense-service')` inside handlers
**Result**: Pending CI verification

## Key Files in the Import Chain

The failing route imports through this chain:

1. `app/api/admin/accounting/expenses/[id]/route.ts`
   - Imports from `@/lib/server/expense-service`

2. `lib/server/expense-service.ts`
   - Re-exports everything from `./accounting`

3. `lib/server/accounting/index.ts`
   - Exports from: `expense-service`, `income-service`, `vat-service`, `csv-import-service`, `types`

4. `lib/server/accounting/expense-service.ts`
   - Imports: `@/lib/prisma`, `../tax-utils`, `./types`

5. `lib/server/accounting/vat-service.ts`
   - Imports: `ExpenseCategory` from `@prisma/client`
   - Uses `Object.values(ExpenseCategory)` which requires enum at build time

## Observations

1. **Platform-specific**: Works on Windows, fails on Ubuntu
2. **Specific route**: Only `/api/admin/accounting/expenses/[id]` is mentioned in error
3. **Similar routes work**: `/api/admin/accounting/income/[id]` uses same imports but isn't mentioned
4. **Build passes locally**: Even with CI environment variables

## Potential Root Causes to Investigate

1. **Case sensitivity**: Linux is case-sensitive, Windows is not
2. **Prisma enum handling**: `ExpenseCategory` enum used in vat-service.ts line 78
3. **Circular imports**: csv-import-service imports from expense-service which both export from index
4. **Module resolution**: Could differ between platforms
5. **Build order**: First dynamic route alphabetically in accounting directory

## Suggested Next Steps

1. Check if the dynamic import fix (attempt #6) resolves the issue
2. If not, try dynamic imports on ALL accounting routes
3. Consider adding `serverExternalPackages` in next.config.ts for Prisma
4. Check for case sensitivity issues in all imports
5. Add verbose logging to CI build to get more error details
6. Try running build on a Linux environment locally (WSL/Docker)

## Related Files

- `frontend/app/api/admin/accounting/expenses/[id]/route.ts` - Failing route
- `frontend/lib/server/expense-service.ts` - Re-export wrapper
- `frontend/lib/server/accounting/` - Main accounting module directory
- `frontend/lib/server/accounting-service.ts` - Auto-accounting from orders
- `frontend/lib/prisma.ts` - Prisma client initialization
- `frontend/next.config.ts` - Next.js configuration
- `.github/workflows/ci.yml` - CI workflow definition
