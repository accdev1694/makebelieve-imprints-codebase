# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow Instructions

**Before starting any work**: Always read `summary.md` (if it exists) to understand current progress and where to continue from previous sessions.

**Git workflow**: Commit changes regularly but do NOT push. The user will push from another terminal.

**Context management**: When conversation context becomes bloated (long sessions, many file edits), create or **overwrite** `summary.md` (never append) with:
- What was accomplished
- Current state of the work
- Next steps to continue
- Any blockers or decisions needed

Then advise the user to start a new chat and reference the summary.

## Project Overview

**MakeBelieve Imprints** is a full-stack e-commerce platform for single-printer custom print services with native iOS/Android support via Capacitor. It uses a monorepo structure with Next.js 15 (App Router) serving both frontend and API routes, deployed on Vercel with Neon PostgreSQL.

## Commands

```bash
# Development
npm install                          # Install all workspace dependencies
npm run dev                          # Run frontend dev server (localhost:3000)
npm run dev:frontend                 # Frontend only

# Build & Quality
npm run build                        # Build (runs prisma generate + next build)
npm run lint                         # ESLint all workspaces
npm run format                       # Prettier auto-format
npm run format:check                 # Verify formatting (CI)

# Testing
npm test                             # Run Jest tests
npm run test:watch                   # Watch mode
npm run test:coverage                # Coverage report
npm run cypress                      # Open Cypress interactive
npm run e2e                          # Run E2E tests headless

# Database
npx prisma db push                   # Push schema to database (no migration history)
npx prisma migrate dev --name <name> # Create and run migration
npx prisma studio                    # Interactive database GUI
npx prisma generate                  # Regenerate Prisma client

# Mobile (Capacitor - WebView approach)
npm run build:mobile                 # Build Next.js for mobile
npm run cap:sync                     # Sync to native projects
npm run mobile:ios                   # Full iOS workflow (build + sync + open Xcode)
npm run mobile:android               # Full Android workflow
```

## Architecture

### Monorepo Structure

```
mkbl/
├── frontend/           # Next.js 15 App Router + Vercel API routes
│   ├── app/
│   │   ├── api/        # 107 serverless API endpoints (auth, orders, admin, etc.)
│   │   ├── (auth)/     # Auth-protected routes (account, checkout)
│   │   └── admin/      # Admin dashboard routes
│   ├── components/     # React components (ui/, admin/, layout/, etc.)
│   ├── contexts/       # AuthContext, CartContext (React Context API)
│   ├── hooks/          # Custom hooks (useCategories, useReceiptScanner, etc.)
│   ├── lib/
│   │   ├── api/        # Client API functions (axios-based)
│   │   └── server/     # Server services (auth, stripe, wise, accounting, etc.)
│   ├── prisma/         # Schema + migrations (PostgreSQL via Neon)
│   └── middleware.ts   # CORS, rate limiting, security headers
├── shared/             # @mkbl/shared package (types + constants)
├── base/               # Architecture docs, planning, coding standards
└── docs/               # API docs (openapi.yaml), setup guides
```

### Key Architectural Patterns

**API Route → Service Layer Pattern**: All API routes in `app/api/` delegate to services in `lib/server/`. Business logic lives in services, routes handle HTTP concerns.

**Authentication**: Stateless JWT with httpOnly cookies. Access tokens (15min) + refresh tokens (7 days, rotated). Password hashing: bcryptjs cost 12.

**State Management**:
- Client state: React Context (Auth, Cart) with localStorage persistence
- Server state: React Query (TanStack Query v5)

**Database**: Prisma ORM with PostgreSQL 16 (Neon serverless). Schema uses snake_case table names, PascalCase model names.

### Service Files (lib/server/)

| Service | Purpose |
|---------|---------|
| `auth-service.ts` | Login, registration, password reset |
| `auth.ts` | JWT token generation, cookie management |
| `stripe-service.ts` | Payment intents, refunds, webhooks |
| `stripe-issuing-service.ts` | Corporate card management |
| `wise-service.ts` | Wise API integration for payments |
| `accounting-service.ts` | Invoices, VAT, financial reports |
| `royal-mail-service.ts` | Shipping labels, tracking |
| `email.ts` | Transactional emails (Resend) |
| `product-search-service.ts` | Full-text product search |

### External Integrations

- **Payments**: Stripe (checkout, webhooks, issuing)
- **Banking**: Wise API (transfers, expense sync)
- **Shipping**: Royal Mail Click and Drop
- **Email**: Resend
- **Storage**: Cloudflare R2 (S3-compatible)
- **Mobile**: Capacitor (iOS/Android WebView)

## Database

Schema location: `frontend/prisma/schema.prisma`

Key models: User, Order, OrderItem, Product, ProductVariant, Design, Invoice, Expense, Supplier, Review, Campaign

**Important**: After schema changes, run `npx prisma migrate dev --name <description>` to create a migration, or `npx prisma db push` for quick iteration without migration history.

**Raw SQL via Neon MCP**: When running SQL queries directly against the database (not through Prisma), use **snake_case table names** (e.g., `orders`, `order_items`, `cancellation_requests`), NOT PascalCase Prisma model names. Prisma models like `Order` map to tables like `orders` via `@@map()` directives.

## Testing Strategy

- **Unit tests**: Jest for services and utilities (60%+ coverage on critical paths)
- **E2E tests**: Cypress for user journeys (auth, checkout, order tracking)
- **Mocking**: Royal Mail service has mock mode for development (no API costs)

Test files: `frontend/__tests__/` and `frontend/cypress/`

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `getUserOrders` |
| Classes/Types/Interfaces | PascalCase | `UserService`, `OrderDTO` |
| Files/Directories | kebab-case | `auth-service.ts` |
| Database Tables | snake_case | `user_id`, `created_at` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| React Components | PascalCase | `OrderCard.tsx` |
| Prisma Models | PascalCase singular | `User`, `Order` |

## Deployment

- **Platform**: Vercel (automatic on push to main)
- **Database**: Neon PostgreSQL
- **Storage**: Cloudflare R2
- **Build command**: `prisma generate && next build`
- **Cron jobs**: Weekly financial report (Monday 9am), daily campaign processing (8am) - configured in `vercel.json`

## Environment Variables

Key variables (see `.env.example` for full list):
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Token signing key
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY`
- `WISE_API_KEY` / `WISE_PROFILE_ID`
- `CLOUDFLARE_R2_*` - Object storage credentials
- `RESEND_API_KEY` - Email service
- `NEXT_PUBLIC_API_URL` - Frontend API endpoint

## Security Considerations

- Middleware enforces CORS (allowed origins in `middleware.ts`)
- Rate limiting: 5 login attempts/15min, 3 registrations/hour
- All API routes require auth except public endpoints
- Input validation with proper error handling in services

## Recent Development Focus

Recent commits show active work on:
- Wise API integration for automatic expense capture
- Stripe Issuing for corporate card management
- Product search with full-text indexing
- Admin accounting and purchasing features
