# Tech Stack with Versions

### Frontend

- **Next.js 15.x** (React framework with App Router)
- **React 18.3+** (UI library)
- **TypeScript 5.3+** (Type safety)
- **Tailwind CSS 3.4+** (Utility-first CSS framework)
- **Capacitor 6.x** (Native mobile app wrapper for iOS/Android)

**Justification:** Next.js provides excellent SEO and performance through its App Router architecture. Deployed on Vercel to leverage automatic optimizations (image optimization, edge functions, zero-config deployments) without operational overhead. React's component-based architecture supports rapid iteration. TypeScript prevents runtime errors across the entire stack. Tailwind enables consistent, responsive UI. Capacitor wraps the web app for App Store and Google Play distribution, providing native device API access (camera, filesystem) while maintaining a single codebase.

### Backend

- **Node.js 22.x LTS** (Runtime - use latest LTS version)
- **Express.js 4.x** (Web framework)
- **TypeScript 5.3+** (Type safety)
- **Prisma 6.x** (ORM for database interactions)
- **jsonwebtoken** (JWT authentication)
- **bcrypt** (Password hashing)
- **Joi or Zod** (Input validation)
- **Royal Mail Click and Drop API** (Shipping integration with manual fallback)

**Justification:** Node.js LTS with Express offers high developer productivity and full-stack JavaScript consistency. Deployed on IONOS VPS for cost-effective backend hosting with full control. Prisma simplifies database operations with type-safe queries. JWT provides stateless authentication (no session storage needed), simplifying horizontal scaling. Royal Mail API integration automates shipping, with documented manual fallback for API outages.

### Database

- **PostgreSQL 16.x** (Relational database - use latest stable version)

**Justification:** PostgreSQL provides ACID compliance for transactional data like orders and payments. It scales to 100K+ orders/year with proper indexing. JSONB support accommodates flexible metadata (shipping addresses, user preferences) without schema migrations. Use IONOS Managed PostgreSQL for automated backups and maintenance.

### Hosting and Infrastructure

**Development (Free - Months 1-4):**
- **Vercel Hobby** (Free Next.js hosting, 100GB bandwidth)
- **Railway Free Tier OR Local** (Backend development, $5 credit/month or local)
- **Neon Serverless Postgres** (Free 512MB database)
- **Cloudflare R2 OR Local** (Free 10GB storage or local filesystem)

**Production (€25-50/month - Month 5+):**
- **Vercel Hobby/Pro** (Frontend hosting)
- **IONOS Cloud VPS** (Express.js API server)
- **IONOS Managed PostgreSQL** (Database)
- **IONOS Object Storage** (S3-compatible storage for user uploads)

**Justification:**
- **Free development**: Use Vercel Hobby, Railway, Neon, and R2 free tiers during development to minimize costs ($0/month for first 4 months). Migrate to production infrastructure when database exceeds 500MB or ready for beta testing.
- **Vercel for frontend**: Zero-config Next.js deployments with automatic image optimization, edge caching, and global CDN. Free tier sufficient for development and small-scale production. Eliminates operational overhead.
- **IONOS for production backend**: Cost-effective VPS hosting (€10/month). 55-70% cheaper than Vercel serverless at scale. No timeout limits for Royal Mail API. Consolidate database and object storage in one provider, reducing egress costs.
- **Separation benefits**: Frontend and backend can scale independently. Frontend deploys automatically on git push via Vercel. Backend remains stable with less frequent deployments. Static frontend works perfectly with Capacitor mobile apps.

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
- **Vercel** (Frontend auto-deployment from GitHub)
- **GitHub Actions** (Backend deployment to IONOS VPS)
- **PM2** (Backend process management)
- **Docker** (Optional - for local development consistency)

**Mobile:**
- **Capacitor 6.x** (Wraps Next.js build for iOS/Android app stores)
- **Xcode** (iOS builds and App Store submissions)
- **Android Studio** (Android builds and Google Play submissions)

**Justification:**
- **Capacitor only** (no PWA): Since app store presence is required, focus on one mobile strategy. Capacitor provides native app wrapping with access to device APIs (camera, push notifications via native plugins).
- **Simplified testing**: Focus on integration tests for critical paths (order flow, authentication) rather than chasing coverage percentages early on.
- **No Kubernetes**: VPS + PM2 is sufficient for single-printer scale. Avoid premature complexity.
- **Split deployment**: Vercel handles frontend automatically. GitHub Actions deploys backend to VPS via SSH.
