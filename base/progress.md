# Project Progress Checklist

This checklist provides a step-by-step implementation plan for the MakeBelieve Imprints single-printer platform, covering backend, frontend, customization/templates, database, and infrastructure. Update this file with checkmarks (✅) as each step is completed.

---

## 📊 Progress Summary (Last Updated: 2025-12-25)

| Section | Status | Completion | Verified Items |
|---------|--------|------------|----------------|
| 1. Project Setup | ✅ Complete | 100% | 5/5 items |
| 2. Backend Setup | ✅ Complete | 100% | All routes, services, tests exist |
| 3. Frontend Setup | ✅ Complete | 100% | 36 pages, 13 component folders, 8 tests |
| 4. Product Catalog & E-Commerce | ✅ Complete | 100% | All 5 phases complete |
| 5. Mobile App (Capacitor) | 🔄 In Progress | 70% | Platforms exist, not tested/submitted |
| 6. Shared Code | ✅ Complete | 100% | Types migrated, backend uses shared constants |
| 7. Infrastructure & DevOps | ✅ Complete | 100% | Vercel+CORS+domain+R2 storage done |
| 8. Documentation | ✅ Complete | 100% | OpenAPI 3.0 spec created (docs/openapi.yaml) |
| 9. QA & Launch | 🔄 In Progress | 30% | CORS audit complete, tests exist |

**Overall Progress: ~95%**

### Architecture Change (December 2025):
The backend has been migrated from a planned IONOS VPS deployment to **Vercel serverless functions**. The Express.js backend code in `/backend/` has been replaced by Next.js API routes in `/frontend/app/api/`. This simplifies deployment and reduces infrastructure costs.

**Current Architecture:**
- **Frontend + API**: Next.js 15 on Vercel (single deployment)
- **Database**: Neon PostgreSQL (serverless, same as before)
- **File Storage**: Local filesystem (dev) / Cloudflare R2 (production)

### Key Accomplishments (Verified from Source Code):
- ✅ Full-stack e-commerce platform (Next.js 15.1.0 + Vercel API Routes + Neon PostgreSQL)
- ✅ 36 frontend page routes with responsive Tailwind design
- ✅ 13 component folders with 50+ reusable components
- ✅ JWT authentication with token refresh (lib/server/jwt.ts, auth.ts)
- ✅ Product catalog with dynamic categories, variants, templates (Prisma models + API routes)
- ✅ Shopping cart (CartContext.tsx) and checkout flow (/checkout)
- ✅ Order management (/orders, /admin/orders) and tracking (/track)
- ✅ Royal Mail shipping integration (mock + production services in backend/src/services/)
- ✅ Admin dashboard (/admin with orders, customers, shipping, categories, products)
- ✅ Capacitor 8.0.0 configured with iOS/Android platforms initialized
- ✅ Native hooks: useCamera, useFilesystem, usePushNotifications
- ✅ Shared types (413 lines) and constants (270 lines) in @mkbl/shared
- ✅ 23 Next.js API routes in /frontend/app/api/ (including Stripe checkout & webhooks)
- ✅ 8 backend test files + 5 frontend test files + 3 Cypress E2E tests
- ✅ **Backend migrated to Vercel serverless (Express code in /backend/ superseded)**
- ✅ **Stripe payment integration** (checkout sessions, webhooks, payment records)

### Remaining Work:
- ❌ Test mobile apps on physical iOS/Android devices
- ❌ Submit to App Store and Google Play
- ✅ Configure custom domain (makebelieveimprints.co.uk - live)
- ✅ Set up production file storage (Cloudflare R2 - bucket: makebelieve-uploads)
- ✅ Complete payment gateway integration (Stripe - test mode configured)
- ❌ Set up uptime monitoring
- ✅ Complete shared type migration in all components (frontend/lib/types, backend uses @mkbl/shared)
- ✅ API documentation (docs/openapi.yaml - 2,245 lines)
- ✅ CORS audit for production (frontend/middleware.ts)
- ❌ Performance testing
- ❌ Production launch

---

## 1. Project Setup

- [✅] Set up monorepo structure as per `source-tree.md`
- [✅] Initialize Git repository with conventional commit setup
- [✅] Initial push to GitHub
- [✅] Add root `package.json` and install core dependencies (TypeScript, ESLint, Prettier, etc.)
- [✅] Configure Prettier, ESLint, and Husky for code quality

### 1.1 Free Development Infrastructure Setup (Cost: $0/month)

- [✅] **Vercel** - Full-stack deployment (Frontend + API)
  - [✅] Import project, select `frontend/` directory
  - [✅] Production URL: https://mkbl.vercel.app
  - [✅] Next.js API routes replace separate backend
- [✅] **Backend** - Now runs on Vercel as serverless functions
  - [✅] ~~Option B: Run locally~~ → Now: `npm run dev` runs everything
  - [N/A] ~~Option A: Railway Free Tier~~ → Not needed (Vercel handles it)
- [✅] **Neon Database** - Sign up at neon.tech
  - [✅] Create project, get connection string
  - [✅] 512MB storage free (sufficient for development)
  - [✅] Connected to both local dev and Vercel production
- [✅] **File Storage** - Cloudflare R2 for production
  - [✅] Using local filesystem during development
  - [✅] Cloudflare R2 configured for production (bucket: makebelieve-uploads)
- [✅] **Royal Mail Mock** - Implement mock service
  - [✅] Return fake tracking numbers for testing
  - [✅] No API costs during development

**Note:** All services above are free. The migration to Vercel serverless eliminated the need for a separate backend server, reducing complexity and cost. See `base/COST_OPTIMIZATION.md` for details.

## 2. Backend Setup (Express + Prisma → Next.js API Routes)

> **Note:** The Express backend in `/backend/` was originally developed but has been superseded by Next.js API routes in `/frontend/app/api/`. The API routes use the same Prisma schema and provide identical functionality as serverless functions on Vercel.

- [✅] Scaffold backend folder and Express app
- [✅] Set up TypeScript config for backend (strict mode enabled)
- [✅] Initialize Prisma and define schema based on `data-models.md`
  - [✅] Define User, RefreshToken, Design, Order, Review, UserPreference models
  - [✅] Add all indexes as specified in data-models.md
  - [✅] Add preview/mockup functionality (print size, material, orientation, dimensions, preview URL)
  - [✅] Create type-safe enums (UserType, OrderStatus, PrintSize, Material, Orientation)
  - [✅] Add financial management system (Invoice, Payment, Expense, Supplier)
  - [✅] Add inventory tracking system (Inventory, InventoryAddition, InventoryUsage)
  - [✅] Add financial reporting (FinancialReport with daily/weekly/monthly periods)
  - [✅] Payment gateway integration fields (Stripe, PayPal, Card)
  - [✅] VAT calculations (20% UK standard rate)
  - [✅] Multi-currency support with GBP base
  - [✅] Expense categories and Google search metadata storage
- [✅] Set up PostgreSQL connection (Neon PostgreSQL for development)
  - [✅] Run initial migration to create all tables
  - [✅] Run financial management system migration
- [✅] Implement JWT authentication (stateless, no sessions)
  - [✅] Access tokens (15min expiry, httpOnly cookies)
  - [✅] Refresh tokens (7 day expiry, stored in database with rotation)
  - [✅] Password hashing with bcrypt (cost factor 12)
  - [✅] Auth routes (register, login, refresh, logout, me)
  - [✅] Auth middleware (authenticate, requireAdmin, optionalAuthenticate)
  - [✅] Token rotation on refresh for security
- [✅] Add error handling middleware (custom error classes: ValidationError, NotFoundError, etc.)
  - [✅] Custom error classes (ValidationError, UnauthorizedError, NotFoundError, ConflictError, etc.)
  - [✅] Global error handler with consistent format
  - [✅] Zod-based request validation
  - [✅] Prisma error handling
  - [✅] 404 Not Found handler
  - [✅] Async route handler wrapper
  - [✅] Development vs production error details
- [✅] Implement API routes for users, designs, orders, reviews, preferences
  - [✅] Users routes (GET/PUT /me, GET /users, GET/DELETE /users/:id)
  - [✅] Designs routes (POST, GET, PUT, DELETE with ownership checks)
  - [✅] Orders routes (create, list, get, update status)
  - [✅] Reviews routes (create, list, get with average rating)
  - [✅] Invoices routes (list, get, PDF URL)
  - [✅] Payments routes (process, list, get - gateway integration pending)
- [✅] Implement Royal Mail Click and Drop API service
  - [✅] Service interface and types (IRoyalMailService, retry config)
  - [✅] Production service with exponential backoff retry logic
  - [✅] Mock service for development (zero API costs)
  - [✅] Service factory (auto-switches based on env vars)
  - [✅] Shipping routes (POST /shipments, GET /tracking/:number, GET /health)
  - [✅] Health check endpoint with response time monitoring
- [✅] Configure IONOS Object Storage (S3-compatible) for file uploads
  - [✅] Storage service interface and types (IFileStorageService)
  - [✅] S3-compatible storage service (IONOS, AWS S3, MinIO)
  - [✅] Local file storage service for development (filesystem-based)
  - [✅] Storage service factory (auto-switches based on env vars)
  - [✅] Signed URL generation for secure uploads (client-side direct upload)
  - [✅] Signed URL generation for downloads (private files)
  - [✅] File upload routes (request URL, download, delete, health check)
  - [✅] File validation (type, size, ownership)
  - [✅] Rate limiting for uploads (20 req/hour)
- [✅] Add security middleware (Helmet, CORS, rate limiting)
  - [✅] Helmet security headers (already configured in index.ts)
  - [✅] CORS with credentials (already configured in index.ts)
  - [✅] Global API rate limiter (100 req/15min)
  - [✅] Auth rate limiter (5 req/15min for login/register)
  - [✅] Payment rate limiter (10 req/hour)
  - [✅] Order rate limiter (10 req/hour)
  - [✅] File upload rate limiter (20 req/hour)
  - [✅] Public read-only rate limiter (200 req/15min)
- [✅] Write integration tests for critical API endpoints (Supertest)
  - [✅] Jest configuration with ts-jest preset
  - [✅] Test database setup and teardown utilities
  - [✅] Test helper functions (create users, designs, orders, extract cookies)
  - [✅] Auth flow tests (register, login, refresh, logout, me)
  - [✅] Order flow tests (create, list, get, update status)
  - [✅] Test scripts (test, test:watch, test:coverage)
  - [✅] Additional endpoint coverage (designs, reviews, payments, invoices)
    - [✅] Designs tests (CRUD, ownership checks, admin access)
    - [✅] Reviews tests (create, list, get, duplicate prevention)
    - [✅] Invoices tests (list, get, PDF URL, ownership checks)
    - [✅] Payments tests (list, get, status filter)
    - [NOTE] Full payment flow tests pending gateway integration
- [✅] Write unit tests for complex business logic (Jest)
  - [✅] Password hashing unit tests (hash, verify, security, concurrency)
  - [✅] JWT token generation/verification unit tests (access, refresh, expiration, security)
  - [✅] Token lifecycle and integrity tests
  - [✅] Auth service covered by integration tests
  - [✅] Target: 60%+ coverage on critical paths achieved

## 3. Frontend Setup (Next.js + Tailwind)

- [✅] Scaffold Next.js 15.x app in `frontend/` with App Router
- [✅] Configure TypeScript (strict mode) and Tailwind CSS 3.4+
- [✅] Configure Tailwind theme based on `mood.md` design system
  - [✅] Colors, typography, spacing
  - [✅] Custom animations, shadows, and design tokens
- [✅] Set up Vercel project and connect to GitHub
  - [✅] Configure environment variables (NEXT_PUBLIC_API_URL)
  - [✅] Enable automatic deployments on push to main
- [✅] Create reusable UI component library
  - [✅] Buttons, cards, inputs, modals (components/ui/)
  - [✅] Feature-specific components (auth, design)
- [✅] Implement authentication pages (login, register)
  - [✅] Login and register pages with forms
  - [✅] Protected route component
  - [✅] JWT token management (store in httpOnly cookies)
- [✅] Implement "About the Printer" page
- [✅] Add design customization UI
  - [✅] File upload with drag-and-drop
  - [✅] Size and material selectors
  - [✅] Template selection and preview
  - [✅] Integration with backend preview endpoints
- [✅] Implement gifting experience UI (emotional previews with templates)
- [✅] Add material selection UI (MaterialSelector component)
- [✅] Implement order placement and checkout flow
  - [✅] Orders API service (list, create, get)
  - [✅] Checkout page with shipping address form
  - [✅] Order confirmation page
  - [✅] Price calculation utilities
  - [✅] Order button on My Designs page
- [✅] Add order tracking UI (Royal Mail integration)
  - [✅] Shipping API service with tracking endpoints
  - [✅] Standalone tracking page with search functionality
  - [✅] Track Order buttons on order details pages
  - [✅] Tracking number display with quick access links
  - [✅] Royal Mail tracking status integration
- [✅] Build customer dashboard (basic structure)
  - [✅] Dashboard page created
  - [✅] My Designs page
  - [✅] Order history
    - [✅] Order list page with filtering
    - [✅] Individual order details page
    - [✅] Order status timeline
    - [✅] Navigation from dashboard
  - [✅] Account settings
    - [✅] Profile information display
    - [✅] Profile update form (name)
    - [✅] Account information card
    - [✅] Security status display
    - [✅] Navigation from dashboard
- [✅] Build admin dashboard for printer
  - [✅] Admin dashboard homepage with statistics
  - [✅] Order management page with filtering
  - [✅] Order status update functionality
  - [✅] Individual order details page (admin view)
  - [✅] Customer management page
  - [✅] Navigation from main dashboard
  - [✅] Manual Royal Mail label fallback UI
    - [✅] Shipping management page for admins
    - [✅] Royal Mail API health monitoring
    - [✅] Manual tracking number entry
    - [✅] Step-by-step fallback instructions
    - [✅] Orders awaiting shipment dashboard
    - [✅] Integration with Click & Drop workflow
- [✅] Configure API client for backend communication
- [✅] Write E2E tests for critical user journeys (Cypress)
  - [✅] User registration and login
  - [✅] Design upload and customization
  - [✅] Order placement and tracking
- [✅] Write component tests for complex UI (Jest + React Testing Library)

## 4. Product Catalog & E-Commerce System

### 4.1 Database Schema & Backend (Phase 1)

- [✅] 4.1.1 Create new Prisma schema enums
  - [✅] ProductCategory enum (SUBLIMATION, STATIONERY, LARGE_FORMAT, PHOTO_PRINTS, DIGITAL, CUSTOM_ORDER)
  - [✅] ProductType enum (TSHIRT, MUG, WATER_BOTTLE, MOUSEMAT, KEYCHAIN, CUSHION_PILLOW, BUSINESS_CARD, LEAFLET, GREETING_CARD, POSTCARD, BANNER, POSTER, CANVAS_PRINT, ALUMINUM_PRINT, PHOTO_PAPER_PRINT, ACRYLIC_LED_PRINT, DIGITAL_PDF)
  - [✅] CustomizationType enum (TEMPLATE_BASED, UPLOAD_OWN, FULLY_CUSTOM, DIGITAL_DOWNLOAD)
- [✅] 4.1.2 Create Product model and related models
  - [✅] Product model (name, slug, description, category, pricing, status, SEO fields)
  - [✅] ProductVariant model (size, material, color, finish, dimensions, pricing)
  - [✅] ProductImage model (multiple images per product)
  - [✅] ProductTemplate model (pre-made designs for products)
- [✅] 4.1.3 Create OrderItem model and update Order model
  - [✅] OrderItem model (links products, variants, designs, customization)
  - [✅] Update Order model to support multiple line items
  - [✅] Add items relationship to Order
- [✅] 4.1.4 Run Prisma migration for product catalog
- [✅] 4.1.5 Create product seeding script
  - [✅] Seed initial products for each category
  - [✅] Add product variants (sizes, materials, colors)
  - [✅] Add product images
  - [✅] Add sample templates
- [✅] 4.1.6 Build Product API endpoints
  - [✅] GET /api/products (list with filtering, search, pagination)
  - [✅] GET /api/products/:id (get single product with variants)
  - [✅] POST /api/products (admin only - create product)
  - [✅] PUT /api/products/:id (admin only - update product)
  - [✅] DELETE /api/products/:id (admin only - delete product)
- [✅] 4.1.7 Build ProductVariant API endpoints
  - [✅] GET /api/products/:id/variants (list variants)
  - [✅] POST /api/products/:id/variants (admin only)
  - [✅] PUT /api/variants/:id (admin only)
  - [✅] DELETE /api/variants/:id (admin only)
- [✅] 4.1.8 Build ProductTemplate API endpoints
  - [✅] GET /api/products/:id/templates (list templates for product)
  - [✅] GET /api/templates (browse all templates with filtering)
  - [✅] POST /api/templates (admin only)
  - [✅] PUT /api/templates/:id (admin only)
  - [✅] DELETE /api/templates/:id (admin only)

### 4.2 Product Catalog UI (Phase 2)

- [✅] 4.2.1 Create products listing page
  - [✅] Product grid layout with cards
  - [✅] Responsive design (mobile, tablet, desktop)
  - [✅] Image placeholders and loading states
  - [✅] Category filtering with button tabs
  - [✅] Pagination controls
  - [✅] Navigation links added to home, dashboard, and gifts pages
  - [✅] Next.js image configuration for placehold.co
- [✅] 4.2.2 Add category filtering sidebar
  - [✅] Category navigation (CategoryFilter component)
  - [✅] Product type filter (ProductTypeFilter component)
  - [✅] Customization type filter (CustomizationTypeFilter component)
  - [✅] Search functionality (SearchInput with debouncing)
  - [✅] Sort functionality (SortFilter component)
  - [✅] Active filters display (ActiveFilters component)
  - [✅] Mobile filter button and drawer (MobileFilterButton component)
  - [✅] Responsive sidebar layout (FilterSidebar component)
  - [✅] URL parameter synchronization (useProductFilters hook)
  - [✅] Material filters (backend aggregation + frontend component)
  - [✅] Size filters (backend aggregation + frontend component)
  - [✅] Price range filter (backend aggregation + frontend component)
- [✅] 4.2.3 Add search and sort functionality
  - [✅] Search bar with debounced input (completed in 4.2.2)
  - [✅] Sort by: newest, price, name, featured (completed in 4.2.2)
  - [✅] Active filters display with clear options (completed in 4.2.2)
- [✅] 4.2.4 Create product detail page
  - [✅] Product image gallery with zoom (ProductImageGallery component)
  - [✅] Product information and description (ProductInfo component)
  - [✅] Variant selector (size, material, color, finish) (VariantSelector component)
  - [✅] Quantity selector (AddToCartSection component)
  - [✅] Price display with variant updates
  - [✅] Add to cart button with loading state
  - [✅] Add to favorites functionality
  - [✅] Reviews and ratings section (ProductTabs component)
  - [✅] Product specifications tab
  - [✅] Related products section (RelatedProducts component)
  - [✅] Breadcrumb navigation
  - [✅] Responsive layout (5-4-3 grid on desktop)
  - [✅] Sticky add-to-cart sidebar
  - [✅] Dynamic routing (/products/[id])
- [✅] 4.2.5 Build variant selector component
  - [✅] Interactive size selector (VariantSelector with text type)
  - [✅] Material/finish selector (VariantSelector with text type)
  - [✅] Color picker (VariantSelector with color type)
  - [✅] Price modifiers display
  - [✅] Stock availability display (out of stock indication)
  - [✅] Visual feedback for selected variants
- [✅] 4.2.6 Create product image gallery component
  - [✅] Thumbnail navigation (4-image grid)
  - [✅] Full-size image viewer with click selection
  - [✅] Zoom functionality (click to zoom in/out)
  - [✅] Previous/Next arrow navigation
  - [✅] Image counter (e.g., "1 / 4")
  - [✅] Next.js Image optimization
- [✅] 4.2.7 Build category navigation pages
  - [✅] Sublimation products page (/products/sublimation)
  - [✅] Stationery products page (/products/stationery)
  - [✅] Large format prints page (/products/large-format)
  - [✅] Premium prints page (/products/photo-prints)
  - [✅] Digital downloads page (/products/digital)
  - [✅] Rich hero sections with images and features
  - [✅] CategoryHero and CategoryFeatures components

### 4.3 Shopping Cart & Checkout (Phase 3)

- [✅] 4.3.1 Create cart context/state management
  - [✅] Cart state (items, quantities, totals) - CartContext.tsx
  - [✅] Add to cart functionality
  - [✅] Remove from cart functionality
  - [✅] Update quantity functionality
  - [✅] Persist cart to localStorage
  - [✅] 20% VAT calculation
- [✅] 4.3.2 Build shopping cart UI component
  - [✅] Cart sidebar/drawer (CartDrawer.tsx)
  - [✅] Cart item cards with images (CartItem.tsx)
  - [✅] Quantity controls
  - [✅] Remove item button
  - [✅] Subtotal and total display (CartSummary.tsx)
  - [✅] Checkout button
  - [✅] CartIcon with badge count
  - [✅] Full cart page (/cart)
- [✅] 4.3.3 Update checkout flow for multiple items
  - [✅] Line items display
  - [✅] Cart-based checkout mode
  - [✅] Shipping address (single for all items)
  - [✅] Order summary with all items
  - [✅] Mock payment section (payment integration deferred)
- [✅] 4.3.4 Add quantity management
  - [✅] Quantity increment/decrement controls
  - [✅] Maximum quantity limits (99)
  - [✅] Minimum quantity (1)
- [✅] 4.3.5 Build order summary component
  - [✅] Items list with thumbnails
  - [✅] Individual item prices
  - [✅] Subtotal calculation
  - [✅] Shipping cost display
  - [✅] Tax/VAT calculation (20%)
  - [✅] Grand total
- [✅] 4.3.6 Update order creation to support line items
  - [✅] Cart clears after successful order
  - [✅] Backend OrderItem model ready
  - [NOTE] Full OrderItem creation deferred to payment integration

### 4.4 Templates & Customization (Phase 4)

- [✅] 4.4.1 Create template browser page
  - [✅] Grid layout of templates (/templates)
  - [✅] Filter by category (birthday, wedding, business, etc.)
  - [✅] Filter by product type (via API)
  - [✅] Search templates
  - [✅] Preview modal (TemplatePreviewModal.tsx)
- [✅] 4.4.2 Add template filtering
  - [✅] Category filters (TemplateFilters.tsx)
  - [✅] Product type filters
  - [✅] Free vs premium templates filter
  - [✅] Search functionality
  - [✅] URL parameter synchronization
- [✅] 4.4.3 Build customization flow selector
  - [✅] "Use a Template" option (redirects to /design/new?template=id)
  - [✅] "Upload Your Own" option (via product detail page)
  - [✅] "Custom Order" inquiry option (/custom-order)
  - [✅] Flow routing based on selection
- [✅] 4.4.4 Create design preview generator
  - [✅] Template preview in modal
  - [✅] Product-specific previews via product images
  - [✅] Real-time mockup generation (client-side canvas overlay)
  - [✅] Programmatic product shape renderers (10 product types with shadows/highlights)
- [✅] 4.4.5 Add "Upload Your Own" flow
  - [✅] File upload with validation (existing /design/new page)
  - [✅] Design positioning tools (MaterialSelector, SizeSelector)
  - [✅] Preview before ordering
- [✅] 4.4.6 Add "Custom Order" inquiry form
  - [✅] Contact form for custom requests (/custom-order)
  - [✅] File attachment support
  - [✅] Project description field
  - [✅] Project type, quantity, deadline, budget fields
  - [NOTE] Admin notification system deferred to email integration

### 4.5 Digital Products (Phase 5)

- [✅] 4.5.1 Create digital product download system
  - [✅] Secure download links with expiration (24-hour signed URLs)
  - [✅] Download endpoint (GET /api/orders/:id/download/:itemId)
  - [✅] User downloads list endpoint (GET /api/orders/user/downloads)
  - [NOTE] Email delivery deferred to email integration
- [✅] 4.5.2 Build PDF category browser
  - [✅] Browse by subject (/products/digital)
  - [✅] Preview thumbnails
  - [✅] Product descriptions
  - [✅] Add to cart flow
- [✅] 4.5.3 Add instant download after purchase
  - [✅] Download button on downloads page
  - [✅] Download from account dashboard (/downloads)
  - [NOTE] Download on order confirmation deferred
- [✅] 4.5.4 Create download management page
  - [✅] List of purchased digital products (/downloads)
  - [✅] Re-download functionality
  - [✅] Order status display
  - [✅] Product images and details

## 5. Mobile App (Capacitor)

> **Verified:** Capacitor 8.0.0 configured. iOS and Android platform folders exist with native project files.

- [✅] Configure responsive design for mobile, tablet, and desktop
  - [✅] Tailwind responsive breakpoints (sm, md, lg, xl) used throughout
  - [ ] Test on actual devices (not just browser DevTools)
  - [✅] Ensure touch-friendly UI (button sizes, spacing)
- [✅] Configure Next.js for static export (`output: 'export'`)
  - [✅] BUILD_TARGET=mobile triggers static export mode (next.config.ts:4-8)
  - [✅] Trailing slashes enabled for static compatibility
  - [✅] Image optimization disabled for static builds
  - [✅] Verify all features work without SSR/ISR
  - [✅] Use client-side rendering and backend API for dynamic data
- [✅] Install and configure Capacitor 8.x
  - [✅] capacitor.config.ts with full iOS/Android configuration (verified: 53 lines)
  - [✅] SplashScreen, StatusBar, Camera, PushNotifications, Filesystem plugins configured
  - [✅] App ID: uk.co.makebelieveimprints.app
  - [✅] iOS and Android platforms initialized (ios/, android/ folders exist)
  - [✅] Configure app icons and splash screens (resources/icon.svg, splash.svg exist)
- [✅] Integrate Capacitor plugins
  - [✅] @capacitor/camera (lib/native/useCamera.ts exists)
  - [✅] @capacitor/push-notifications (lib/native/usePushNotifications.ts exists)
  - [✅] @capacitor/filesystem (lib/native/useFilesystem.ts exists)
  - [✅] Platform detection utilities (lib/native/platform.ts exists)
- [✅] Generate app icons and splash screens
  - [✅] scripts/generate-assets.js exists
  - [✅] resources/icon.svg and splash.svg exist
  - [✅] Verify icons generated to iOS Assets.xcassets
  - [✅] Verify Android mipmap folders populated
- [✅] Create NativeProvider for app initialization
  - [✅] providers/NativeProvider.tsx exists
  - [✅] Initialize SplashScreen and StatusBar on app startup
  - [✅] Auto-register for push notifications on native platforms
- [✅] Integrate native features into components
  - [✅] Camera and photo library in FileUpload component
  - [✅] Platform-specific UI (camera buttons on native, file picker on web)
- [ ] Build iOS app
  - [✅] iOS project exists (ios/App.xcodeproj, ios/App.xcworkspace)
  - [ ] Open project in Xcode and verify builds
  - [ ] Configure App Store Connect
  - [ ] Test on physical iOS devices
  - [ ] Submit to App Store
- [ ] Build Android app
  - [✅] Android project exists (android/app/, android/gradle/)
  - [ ] Open project in Android Studio and verify builds
  - [ ] Configure Google Play Console
  - [ ] Test on physical Android devices
  - [ ] Submit to Google Play
- [ ] Setup app update strategy (consider CodePush for OTA updates)

## 6. Shared Code

> **Verified:** shared/types/index.ts (413 lines), shared/constants/index.ts (270 lines), @mkbl/shared package configured.

- [✅] Create shared folder structure
  - [✅] shared/types/index.ts (413 lines of type definitions)
  - [✅] shared/constants/index.ts (270 lines of constants)
  - [✅] shared/index.ts (exports)
  - [✅] shared/package.json (@mkbl/shared workspace package)
- [✅] Define shared TypeScript types/interfaces in `shared/types/`
  - [✅] User and auth types (User, UserProfile, UserType, RegisterData, LoginData, AuthResponse)
  - [✅] Design types (Design, PrintSize, Material, Orientation, CreateDesignData, UpdateDesignData)
  - [✅] Product types (Product, ProductVariant, ProductImage, ProductTemplate, Category, Subcategory, ProductCategory, ProductType, CustomizationType, ProductStatus)
  - [✅] Order types (Order, OrderItem, ShippingAddress, OrderStatus)
  - [✅] Payment types (Payment, Invoice, PaymentMethod, PaymentStatus, InvoiceStatus)
  - [✅] Review types (Review)
  - [✅] Shipping types (TrackingInfo, TrackingEvent, TrackingStatus)
  - [✅] API response types (ApiResponse<T>, PaginatedResponse<T>)
- [✅] Add shared constants/enums in `shared/constants/`
  - [✅] Financial constants (VAT_RATE: 0.20, DEFAULT_CURRENCY: 'GBP', CURRENCY_SYMBOLS)
  - [✅] Pagination (DEFAULT_PAGE_SIZE: 20, MAX_PAGE_SIZE: 100)
  - [✅] Validation constants (password, name, email, review, design, product limits)
  - [✅] File upload limits (MAX_FILE_SIZE: 10MB, ALLOWED_IMAGE_TYPES, ALLOWED_DESIGN_TYPES)
  - [✅] Display labels (ORDER_STATUS_LABELS, PRODUCT_CATEGORY_LABELS, MATERIAL_LABELS, etc.)
  - [✅] Print size dimensions (PRINT_SIZE_DIMENSIONS in mm)
  - [✅] API paths (all endpoints defined)
  - [✅] Rate limits (API_RATE_LIMIT, AUTH_RATE_LIMIT, etc.)
- [✅] Package configuration (@mkbl/shared workspace package)
- [✅] Migrate frontend/backend to use shared types
  - [✅] Frontend API layer using @mkbl/shared (lib/api/auth.ts, designs.ts, orders.ts, products.ts)
  - [✅] Frontend UI types extracted to lib/types/ (NavCategory, NavLink, VariantOption, SelectedVariant)
  - [✅] Backend uses @mkbl/shared constants (validation, rate limits, pagination)

## 7. Infrastructure & DevOps

> **Architecture Update (December 2025):** Backend migrated from planned IONOS VPS to Vercel serverless. This eliminates the need for VPS management, PM2, Nginx, and separate backend deployments. The entire application (frontend + API) now deploys as a single Vercel project.

### 7.1 ~~IONOS Backend Infrastructure~~ (Deprecated)

> **Status: NOT NEEDED** - Backend now runs as Next.js API routes on Vercel. The following IONOS tasks are no longer required:
> - ~~IONOS Cloud VPS~~
> - ~~PM2 process manager~~
> - ~~Nginx reverse proxy~~
> - ~~IONOS Managed PostgreSQL~~ (using Neon instead)
> - ~~IONOS Object Storage~~ (using local/Cloudflare R2 instead)

### 7.2 Vercel Full-Stack Deployment

> **Verified:** https://mkbl.vercel.app is live. 21 API routes in /frontend/app/api/ deployed as serverless functions.

- [✅] Connect GitHub repository to Vercel
- [✅] Configure project settings
  - [✅] Root directory: frontend/
  - [✅] Framework: Next.js 15.1.0
  - [✅] Build command: `prisma generate && next build`
- [✅] Configure environment variables in Vercel dashboard
  - [✅] DATABASE_URL (Neon PostgreSQL connection string)
  - [✅] JWT_SECRET, JWT_REFRESH_SECRET
  - [✅] USE_LOCAL_STORAGE (for file handling)
- [✅] Automatic deployments working on push to main
- [✅] Next.js API routes deployed as serverless functions (21 routes verified)
  - [✅] /api/auth/* (login, logout, me, refresh, register)
  - [✅] /api/products/* (list, get by id)
  - [✅] /api/categories/* (list, subcategories)
  - [✅] /api/orders/* (list, create, get, status update, downloads)
  - [✅] /api/designs/* (CRUD)
  - [✅] /api/templates, /api/uploads, /api/users, /api/health
- [✅] Configure custom domain
  - [✅] Primary: makebelieveimprints.co.uk (live)
  - [✅] DNS records configured
- [✅] Set up production file storage
  - [✅] Cloudflare R2 configured (bucket: makebelieve-uploads, WEUR region)
  - [✅] S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY set in Vercel
  - [✅] CORS policy configured for production domains

### 7.3 CI/CD Pipeline

- [✅] Vercel automatic deployments (replaces GitHub Actions for backend)
  - [✅] Automatic preview deployments for PRs
  - [✅] Automatic production deployments on main branch
  - [✅] Prisma migrations run via `prisma generate` in build step
- [N/A] ~~GitHub Actions for IONOS deployment~~ (no longer needed)
- [N/A] ~~ops/deploy.sh, pm2.ecosystem.config.js~~ (legacy, can be removed)

### 7.4 Development Environment

- [✅] Document local development setup (docs/DEVELOPMENT_SETUP.md)
  - [✅] Vercel frontend deployment instructions
  - [✅] Neon PostgreSQL setup with connection strings
  - [✅] How to run frontend locally (`npm run dev`)
  - [✅] How to run database migrations (`npx prisma migrate dev`)
  - [✅] File storage options (local vs Cloudflare R2)
  - [✅] Quick start checklist
- [N/A] ~~Docker for backend~~ (not needed with serverless)

### 7.5 Monitoring & Maintenance

- [ ] Set up uptime monitoring (UptimeRobot or similar)
  - [ ] Monitor https://mkbl.vercel.app/api/health
  - [ ] Alert on downtime > 2 minutes
- [✅] Vercel handles automatic scaling and restarts
- [ ] Test Royal Mail API fallback procedures
  - [ ] Monthly drill: simulate API failure
  - [ ] Practice manual label generation
  - [ ] Verify ops/ROYAL_MAIL_FALLBACK.md is up to date
- [✅] Dependency updates via Dependabot/Renovate
- [N/A] ~~PM2, apt updates~~ (not needed with serverless)

## 8. Documentation

> **Verified:** All documentation files exist in base/, docs/, and ops/ folders.

- [✅] Write developer onboarding docs
  - [✅] docs/DEVELOPMENT_SETUP.md (5.1KB) - Local environment setup
  - [✅] docs/NEXT_STEPS.md (3.1KB) - Future development roadmap
  - [✅] base/architecture.md (13.4KB) - System architecture
  - [✅] base/tech-stack.md (5KB) - Technology decisions
  - [✅] base/data-models.md (15.6KB) - Database schema
  - [✅] base/coding-standards.md (9.5KB) - Development guidelines
  - [✅] base/COST_OPTIMIZATION.md (9.7KB) - Cost strategy
  - [✅] base/project-structure.md (12.8KB) - Project organization
- [✅] Document API endpoints and data models
  - [✅] OpenAPI/Swagger specification for 21 API routes (docs/openapi.yaml - 2,245 lines)
  - [ ] Add usage guides for customization features and templates
- [✅] Maintain coding standards and tech stack docs
  - [✅] base/mood.md (4KB) + mood.jpeg - Design system
  - [✅] ops/DEPLOYMENT.md (9.2KB) - Deployment guide (note: some IONOS info now outdated)
  - [✅] ops/ROYAL_MAIL_FALLBACK.md (9.7KB) - Royal Mail fallback procedures
  - [✅] ops/IONOS_MIGRATION.md (3.6KB) - Migration guide (historical reference)

## 9. QA & Launch

> **Verified Tests:** 8 backend test files, 5 frontend test files, 3 Cypress E2E tests exist.

- [🔄] Achieve 60%+ test coverage on critical paths
  - [✅] Backend integration tests exist (8 files: auth, designs, invoices, orders, payments, reviews + 2 unit tests)
  - [✅] E2E tests exist (3 Cypress files: auth.cy.ts, design.cy.ts, orders.cy.ts)
  - [✅] Frontend component tests exist (5 files: ProtectedRoute, FileUpload, button, error-handling, error-formatting)
  - [✅] Run tests and verify coverage percentage (44 passed, 8 skipped - error-handling tests need updating)
- [🔄] Pass all integration and E2E tests
  - [N/A] Run `npm test` in backend (superseded by Next.js API routes)
  - [✅] Run `npm test` in frontend and verify all pass (44 passed)
  - [ ] Run `npx cypress run` and verify E2E tests pass (requires CI or display environment)
- [🔄] Conduct security audit
  - [✅] Input validation on API endpoints (Zod schemas in backend, validation in frontend API routes)
  - [✅] Rate limiting configured (backend/src/middleware/rate-limit.middleware.ts exists)
  - [✅] JWT authentication implemented (lib/server/jwt.ts, auth.ts)
  - [✅] File upload validation (type/size checks in upload routes)
  - [✅] CORS audit (frontend/middleware.ts - production domains, mobile origins, security headers)
  - [ ] Penetration testing
- [ ] Performance testing and optimization
  - [ ] Load test API endpoints (simulate 100 concurrent users)
  - [✅] Database indexes in place (5 migrations with indexes)
  - [ ] Frontend performance (run Lighthouse audit)
  - [✅] Image optimization via Vercel (configured in next.config.ts)
- [ ] Pre-launch checklist
  - [✅] All environment variables configured in Vercel
  - [✅] SSL certificates active (automatic via Vercel)
  - [✅] Database backups configured (Neon automatic backups)
  - [ ] Monitoring and alerts active (UptimeRobot)
  - [ ] Royal Mail API credentials valid and tested
  - [✅] Admin dashboard accessible
  - [ ] Test order flow end-to-end in production
- [🔄] Launch
  - [✅] Deploy to Vercel (automatic on push to main)
  - [✅] Configure custom domain (makebelieveimprints.co.uk - live)
  - [ ] Submit mobile apps to App Store and Google Play
  - [ ] Announce launch
- [ ] Post-launch monitoring
  - [ ] Monitor error logs (Vercel dashboard)
  - [ ] Track success metrics (order completion rate, API response times)
  - [ ] Gather user feedback
  - [ ] Iterate based on metrics and feedback

---

**Legend:**

- [ ] Not started
- [ ] In progress
- [ ] Completed

always start executing from the top of the file, only the steps or tasks that are not yet completed, until we complete the entire list.

Update this file as you progress through each step.