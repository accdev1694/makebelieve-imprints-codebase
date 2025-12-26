# Tech Stack with Versions

### Frontend

- **Next.js 15.x** (React framework with App Router)
- **React 18.3+** (UI library)
- **TypeScript 5.3+** (Type safety)
- **Tailwind CSS 3.4+** (Utility-first CSS framework)
- **Capacitor 6.x** (Native mobile app wrapper for iOS/Android)

**Justification:** Next.js provides excellent SEO and performance through its App Router architecture. Deployed on Vercel to leverage automatic optimizations (image optimization, edge functions, zero-config deployments) without operational overhead. React's component-based architecture supports rapid iteration. TypeScript prevents runtime errors across the entire stack. Tailwind enables consistent, responsive UI. Capacitor wraps the web app for App Store and Google Play distribution, providing native device API access (camera, filesystem) while maintaining a single codebase.

### Backend

- **Next.js API Routes** (Serverless functions on Vercel)
- **TypeScript 5.3+** (Type safety)
- **Prisma 6.x** (ORM for database interactions)
- **jsonwebtoken** (JWT authentication)
- **bcrypt** (Password hashing)
- **Zod** (Input validation)
- **Royal Mail Click and Drop API** (Shipping integration with manual fallback)

**Justification:** Next.js API Routes provide serverless backend functions deployed alongside the frontend on Vercel. Single deployment, zero infrastructure management. Prisma simplifies database operations with type-safe queries. JWT provides stateless authentication (no session storage needed). Royal Mail API integration automates shipping, with documented manual fallback for API outages.

### Database

- **PostgreSQL 16.x** (Relational database - use latest stable version)

**Justification:** PostgreSQL provides ACID compliance for transactional data like orders and payments. It scales to 100K+ orders/year with proper indexing. JSONB support accommodates flexible metadata (shipping addresses, user preferences) without schema migrations. Neon Serverless Postgres provides automated backups and maintenance with a generous free tier.

### Hosting and Infrastructure

**All Environments (Free or $0-20/month):**
- **Vercel Hobby/Pro** (Full-stack: Next.js frontend + API routes)
- **Neon Serverless Postgres** (Free 512MB database, scales as needed)
- **Cloudflare R2** (Free 10GB storage, S3-compatible)
- **IONOS** (Domain/DNS only)

**Justification:**
- **Vercel for everything**: Zero-config Next.js deployments with automatic image optimization, edge caching, and global CDN. API routes run as serverless functions. Free tier sufficient for development and small-scale production. Single deployment, zero infrastructure management.
- **Neon for database**: Serverless Postgres with generous free tier (512MB), autosuspend, and database branching for testing.
- **Cloudflare R2 for storage**: S3-compatible object storage with 10GB/month free. No egress fees.
- **Simplicity**: Single Vercel project handles frontend + API. No VPS, no PM2, no nginx to manage.

### Supporting Tools

**Development:**
- **ESLint 8.x** (Linting)
- **Prettier 3.x** (Code formatting)
- **Husky** (Git hooks for pre-commit checks)

**Testing:**
- **Jest** (Unit and integration testing)
- **Cypress** (E2E testing for critical flows)
- **Supertest** (API endpoint testing)

**Deployment:**
- **Vercel** (Auto-deployment from GitHub for frontend + API)
- **Docker** (Optional - for local development consistency)

**Mobile:**
- **Capacitor 6.x** (Wraps Next.js build for iOS/Android app stores)
- **Xcode** (iOS builds and App Store submissions)
- **Android Studio** (Android builds and Google Play submissions)

**Justification:**
- **Capacitor only** (no PWA): Since app store presence is required, focus on one mobile strategy. Capacitor provides native app wrapping with access to device APIs (camera, push notifications via native plugins).
- **Simplified testing**: Focus on integration tests for critical paths (order flow, authentication) rather than chasing coverage percentages early on.
- **Vercel-only deployment**: Single project handles frontend + API. No VPS, no PM2, no nginx. Automatic deployments from GitHub.
