# MakeBelieve Imprints - Software Architecture

## 1. Overview

This document outlines the software architecture for MakeBelieve Imprints, a single-printer platform designed to connect customers with a dedicated print service provider. The architecture is designed to be a modular, scalable, and maintainable system that supports a rich user experience for custom print design and ordering.

## 2. Architectural Principles

- **Modular Monorepo:** The codebase is organized in a monorepo to facilitate code sharing and streamline dependency management while maintaining a clear separation of concerns between the frontend and backend.
- **Separation of Concerns:** Each part of the application (frontend and backend) is developed as a distinct module, allowing for independent development, testing, and deployment.
- **Scalability and Performance:** The architecture is designed to handle a growing user base, with a focus on performance through server-side rendering, efficient database queries, and caching strategies.
- **Type Safety:** TypeScript is used across the entire stack to ensure type safety, reduce runtime errors, and improve developer productivity.

## 3. Frontend Architecture

- **Framework:** Next.js (React) is used for the frontend, providing server-side rendering (SSR) and static site generation (SSG) for fast page loads and excellent SEO.
- **Styling:** Tailwind CSS is used for a utility-first approach to styling, enabling rapid and consistent UI development.
- **State Management:** For complex state interactions, a modern state management library like React Context or Zustand will be used.
- **Key Components:**
  - **`app/`:** Contains the main application pages, including the "About the Printer" page, design customization tools, and user dashboards.
  - **`components/`:** A library of reusable UI components.
  - **`lib/`:** Utility functions, API client, and other helper modules.

## 4. Backend Architecture

- **Framework:** Express.js running on Node.js provides a robust and scalable foundation for the RESTful API.
- **Language:** TypeScript is used for type safety and consistency with the frontend.
- **Database Interaction:** Prisma is used as the Object-Relational Mapper (ORM) to interact with the PostgreSQL database, simplifying database operations and ensuring data integrity.
- **Key Components:**
  - **`src/routes/`:** Defines the API endpoints for handling user authentication, orders, designs, financial operations, and other resources.
  - **`src/services/`:** Contains the core business logic, including:
    - Payment processing (Stripe, PayPal integration)
    - Royal Mail service for shipping and tracking
    - Invoice generation with VAT calculations
    - Financial reporting and analytics
    - Inventory management
    - Google search integration for procurement
  - **`src/middleware/`:** Includes middleware for authentication, input validation, and error handling.
  - **`prisma/`:** Holds the database schema and migration files.

## 5. Personalization and Templates

- **Approach:** Personalization is achieved using a template library, curated copy, and user-provided uploads rather than external machine learning services. This keeps the system simpler, more auditable, and easier to maintain.
- **Implementation:** The backend exposes preview endpoints that render template-based previews from user selections and uploaded assets. Templates and presets are versioned and stored with designs to ensure consistent previews.

## 6. Data Architecture

- **Database:** PostgreSQL is the relational database of choice, providing ACID compliance for transactional data and robust support for JSONB data types to store flexible metadata.
- **Data Models:** The core data models are organized into three categories:

  **Core Models:**
  - **`users`:** Represents customers and the admin (the printer).
  - **`designs`:** Stores user-uploaded or template-assisted designs with print specifications and preview URLs.
  - **`orders`:** Tracks customer orders from placement to delivery with print specifications snapshot.
  - **`reviews`:** Stores customer reviews of their orders.
  - **`user_preferences`:** Stores user preferences used by template selection and preview rendering.
  - **`refresh_tokens`:** JWT refresh tokens for secure authentication.

  **Financial Models:**
  - **`invoices`:** Auto-generated invoices with VAT calculations and multi-currency support.
  - **`payments`:** Payment processing records (Stripe, PayPal, Card) with transaction tracking.
  - **`expenses`:** Business expenses with categories, supplier links, and Google search metadata.
  - **`suppliers`:** Supplier database with ratings for price comparison.
  - **`financial_reports`:** Cached daily/weekly/monthly reports with revenue, expenses, and profit tracking.

  **Inventory Models:**
  - **`inventory`:** Material stock tracking (paper, ink, packaging) with reorder alerts.
  - **`inventory_additions`:** Logs when materials are purchased (links to expenses).
  - **`inventory_usages`:** Logs when materials are used for orders (auto-deducts stock).

- **Data Flow:** The frontend interacts with the backend API, which in turn queries the database via Prisma. All data is validated and sanitized at the API layer to ensure security and integrity. Financial operations (invoicing, payments, inventory) are automated via service layer business logic.

## 7. Infrastructure and Deployment

### 7.1 Development Environment (Cost: $0/month)

**Use free tiers for all services during development (Months 1-4).**

**Frontend:**
- **Platform:** Vercel Hobby (Free)
- **Bandwidth:** 100GB/month (sufficient for dev/testing)
- **URL:** https://mkbl.vercel.app (free subdomain)
- **Deployments:** Automatic from GitHub pushes

**Backend:**
- **Platform:** Railway Free Tier OR Local development
  - Railway: $5 credit/month (auto-deploys from GitHub)
  - Local: `npm run dev` at http://localhost:4000
- **Deployment:** Auto-deploy on push to GitHub (Railway) or manual local runs

**Database:**
- **Platform:** Neon Serverless Postgres (Free)
- **Storage:** 512MB (sufficient for development)
- **Features:** Autosuspends after 5min inactivity, database branching for testing
- **Connection:** Cloud-hosted, accessible from Railway and local dev

**File Storage:**
- **Platform:** Cloudflare R2 (Free) OR Local filesystem
  - R2: 10GB/month free, S3-compatible API
  - Local: Store uploads in `backend/uploads/` directory during development
- **Migration:** Easy switch to IONOS S3 when ready (same S3 API)

**Royal Mail API:**
- **Mock service** during development (return fake tracking numbers)
- No API costs until production testing

**Migration Trigger:** Move to production infrastructure when:
- Database exceeds 500MB
- Need 24/7 uptime (no cold starts)
- Ready for beta testing with real users
- Typically Month 5 (pre-launch testing phase)

---

### 7.2 Production Environment (Cost: €25-50/month)

**Frontend Hosting:**
- **Platform:** Vercel Hobby (Free) or Pro ($20/month)
- **Deployment:** Automatic deployment from GitHub on push to main branch
- **Features:** Global CDN, automatic image optimization, edge functions, zero-config SSL
- **Environment:** Configure backend API URL via environment variables
- **Custom Domain:** Requires Vercel Pro or use DNS configuration

**Backend Hosting:**
- **Platform:** IONOS Cloud VPS
- **Specs:** Start with 2 vCPU, 4GB RAM (€10/month), scale as needed
- **Process Management:** PM2 for Node.js process management
- **Reverse Proxy:** Nginx for SSL termination and request routing
- **Deployment:** GitHub Actions SSH deployment (build → archive → SCP → restart)

**Database:**
- **Platform:** IONOS Managed PostgreSQL
- **Specs:** Start with Starter plan (€10/month), scale vertically as database grows
- **Backups:** Automated daily backups (managed service)
- **Access:** Direct connection from backend VPS (private network preferred)

**File Storage:**
- **Platform:** IONOS Object Storage (S3-compatible)
- **Usage:** User-uploaded designs, generated previews, order assets
- **Access:** Direct uploads/downloads via signed URLs from backend API
- **Cost:** €5/month base + usage
- **No syncing:** Use IONOS Object Storage as single source of truth

**CI/CD:**
- **Frontend:** Vercel auto-deployment (no GitHub Actions needed)
- **Backend:** GitHub Actions workflow for building and deploying to IONOS VPS

**Operational Notes:**
- **Simplicity first**: Single VPS with PM2 (no Kubernetes) is sufficient for single-printer scale
- **Monitoring**: Basic uptime monitoring (UptimeRobot or similar), application logs via PM2
- **Backups**: Database backups managed by IONOS, object storage versioning enabled
- **Scaling**: Frontend scales automatically via Vercel. Backend can scale vertically (larger VPS) or horizontally (multiple VPS + load balancer) when needed

**Cost Comparison:**
- Development (Months 1-4): $0/month (all free tiers)
- Pre-launch Testing (Month 5): €25/month (IONOS services)
- Production Launch (Month 6+): €40-50/month (add domain + optional Vercel Pro)

**Why Split Architecture (Vercel + IONOS):**
- 55-70% cheaper than all-Vercel serverless at scale
- Better for Capacitor mobile apps (static export required)
- No timeout limits for Royal Mail API integration
- Predictable monthly costs (no surprise bills from traffic spikes)
- See `base/COST_OPTIMIZATION.md` for detailed analysis

## 8. Security

- **Authentication:** Stateless JWT authentication (no server-side sessions)
  - JWTs signed with HS256 or RS256, stored in httpOnly cookies or Authorization headers
  - Passwords hashed with bcrypt (cost factor 10-12)
  - Refresh tokens stored in database for long-lived sessions with revocation capability
  - No session storage in Redis or Postgres - fully stateless for horizontal scaling
- **Input Validation:** All incoming data validated using Joi or Zod schemas at API layer
- **API Security:**
  - Rate limiting per IP/user to prevent abuse
  - CORS configuration to allow only frontend domain
  - Helmet.js for security headers
  - HTTPS-only in production (TLS via Nginx)
- **File Upload Security:**
  - Validate file types and sizes before accepting uploads
  - Scan uploads for malicious content
  - Use signed URLs with expiration for S3 access
- **Error Handling:** Centralized Express middleware returns sanitized errors (no stack traces or sensitive data in production)

## 9. Mobile App Strategy (Capacitor)

To provide native iOS and Android apps available on the App Store and Google Play, the project uses **Capacitor** to wrap the Next.js web application into a native container. This approach maintains a single codebase while delivering a true native app experience.

### 9.1. Why Capacitor (Not PWA)

**Decision:** Use Capacitor exclusively for mobile strategy.

**Rationale:**
- **App Store Requirement:** The business requires presence on Apple App Store and Google Play for discoverability and user preference
- **Native APIs:** Capacitor provides access to device features (camera for design uploads, local file system, native push notifications)
- **Single Strategy:** Maintaining both PWA and Capacitor adds complexity. Since app stores are required, Capacitor is the only necessary mobile solution
- **Performance:** Capacitor apps feel more native than PWAs, with proper splash screens, navigation gestures, and system integration

### 9.2. Implementation Details

**Build Process:**
1. **Next.js Static Export:** Configure Next.js to export a static build (`output: 'export'`)
   - Note: This limits some Next.js features (no ISR, server actions, or dynamic SSR routes)
   - Use client-side rendering and API routes from backend for dynamic content
2. **Capacitor Integration:** Add Capacitor to frontend project and configure iOS/Android platforms
3. **Native Projects:** Capacitor generates Xcode (iOS) and Android Studio (Android) projects

**Responsive Design:**
- Tailwind CSS provides fully responsive UI that adapts to mobile, tablet, and desktop screens
- Test on actual devices during development (not just browser DevTools)

**Native Features via Capacitor Plugins:**
- **Camera:** `@capacitor/camera` for photo uploads directly from device
- **Push Notifications:** `@capacitor/push-notifications` for order status updates
- **Filesystem:** `@capacitor/filesystem` for local caching of designs
- **App Updates:** Consider CodePush or similar for OTA updates (optional)

**App Store Deployment:**
1. **iOS:** Build in Xcode, configure App Store Connect, submit for review
2. **Android:** Build APK/AAB in Android Studio, upload to Google Play Console

### 9.3. Trade-offs and Limitations

**Limitations:**
- Next.js static export means no server-side rendering or incremental static regeneration
- API calls must go to backend API (deployed on IONOS) for dynamic data
- Larger app bundle size compared to pure native apps

**Benefits:**
- Single TypeScript/React codebase for web and mobile
- Faster development than maintaining separate native codebases
- Web developers can build mobile apps without learning Swift/Kotlin
- Easy updates: rebuild and redeploy to app stores (or use OTA updates)

**Web Access:**
Users who don't want to install the app can still access the full website via browser at the Vercel-hosted URL. The website will be responsive and work on mobile browsers, just without native app features.
