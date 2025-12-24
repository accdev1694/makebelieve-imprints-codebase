# Project Progress Checklist

This checklist provides a step-by-step implementation plan for the MakeBelieve Imprints single-printer platform, covering backend, frontend, customization/templates, database, and infrastructure. Update this file with checkmarks (✅) as each step is completed.

---

## 1. Project Setup

- [✅] Set up monorepo structure as per `source-tree.md`
- [✅] Initialize Git repository with conventional commit setup
- [✅] Initial push to GitHub
- [✅] Add root `package.json` and install core dependencies (TypeScript, ESLint, Prettier, etc.)
- [✅] Configure Prettier, ESLint, and Husky for code quality

### 1.1 Free Development Infrastructure Setup (Cost: $0/month)

- [✅] **Vercel Hobby** - Connect GitHub repo to Vercel
  - [✅] Import project, select `frontend/` directory
  - [✅] Get free URL: https://mkbl.vercel.app
- [✅] **Backend** - Choose development approach
  - [✅] Option B: Run locally (`npm run dev`) - SELECTED
  - [ ] Option A: Railway Free Tier (optional for later)
- [✅] **Neon Database** - Sign up at neon.tech
  - [✅] Create project, get connection string
  - [✅] 512MB storage free (sufficient for development)
- [✅] **Cloudflare R2** - Sign up for R2
  - [✅] Using local filesystem during development
  - [ ] Optional: Set up R2 for production-like testing
- [✅] **Royal Mail Mock** - Implement mock service
  - [✅] Return fake tracking numbers for testing
  - [✅] No API costs during development

**Note:** All services above are free. See `base/COST_OPTIMIZATION.md` for details.

## 2. Backend Setup (Express + Prisma)

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
  - [ ] Additional endpoint coverage (designs, reviews, payments, invoices)
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
  - [DEFERRED] Material filters (requires backend aggregation)
  - [DEFERRED] Size filters (requires backend aggregation)
  - [DEFERRED] Price range filter (requires backend aggregation)
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
  - [NOTE] Real-time mockup generation deferred
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

- [ ] Configure responsive design for mobile, tablet, and desktop
  - [ ] Test on actual devices (not just browser DevTools)
  - [ ] Ensure touch-friendly UI (button sizes, spacing)
- [ ] Configure Next.js for static export (`output: 'export'`)
  - [ ] Verify all features work without SSR/ISR
  - [ ] Use client-side rendering and backend API for dynamic data
- [ ] Install and configure Capacitor 6.x
  - [ ] Initialize iOS and Android platforms
  - [ ] Configure app icons and splash screens
- [ ] Integrate Capacitor plugins
  - [ ] @capacitor/camera (for design photo uploads)
  - [ ] @capacitor/push-notifications (for order status updates)
  - [ ] @capacitor/filesystem (for local design caching)
- [ ] Build iOS app
  - [ ] Open project in Xcode
  - [ ] Configure App Store Connect
  - [ ] Test on physical iOS devices
  - [ ] Submit to App Store
- [ ] Build Android app
  - [ ] Open project in Android Studio
  - [ ] Configure Google Play Console
  - [ ] Test on physical Android devices
  - [ ] Submit to Google Play
- [ ] Setup app update strategy (consider CodePush for OTA updates)

## 6. Shared Code

- [ ] Define shared TypeScript types/interfaces in `shared/types/`
- [ ] Add shared constants/enums in `shared/constants/`
- [ ] Ensure type safety across frontend and backend

## 7. Infrastructure & DevOps

### 7.1 IONOS Backend Infrastructure

- [ ] Provision IONOS Cloud VPS
  - [ ] Ubuntu 22.04 LTS, minimum 2 vCPU, 4GB RAM
  - [ ] Configure firewall (ports 22, 80, 443, 4000 internal)
- [ ] Install backend dependencies on VPS
  - [ ] Node.js 22.x LTS
  - [ ] PM2 (process manager)
  - [ ] Nginx (reverse proxy)
  - [ ] Certbot (SSL certificates)
- [ ] Configure Nginx reverse proxy
  - [ ] Copy ops/nginx-site.conf to /etc/nginx/sites-available/
  - [ ] Setup SSL with Let's Encrypt (certbot)
- [ ] Set up IONOS Managed PostgreSQL
  - [ ] PostgreSQL 16.x, minimum 2 vCPU, 4GB RAM
  - [ ] Enable automated daily backups
  - [ ] Configure private network connection from VPS
- [ ] Set up IONOS Object Storage (S3-compatible)
  - [ ] Create bucket: mkbl-uploads
  - [ ] Enable versioning for backup/recovery
  - [ ] Generate access keys
  - [ ] Configure CORS if needed
- [ ] Configure environment variables on VPS
  - [ ] Create /home/deploy/app/backend/.env with all secrets
  - [ ] Reference ops/DEPLOYMENT.md for required variables

### 7.2 Vercel Frontend Deployment

- [ ] Connect GitHub repository to Vercel
- [ ] Configure project settings
  - [ ] Root directory: frontend/
  - [ ] Framework: Next.js
  - [ ] Node.js version: 22.x
- [ ] Configure environment variables in Vercel dashboard
  - [ ] NEXT_PUBLIC_API_URL=https://api.makebelieveimprints.co.uk
- [ ] Configure custom domain
  - [ ] Frontend: makebelieveimprints.co.uk
  - [ ] Configure DNS records
- [ ] Verify automatic deployments work on push to main

### 7.3 CI/CD Pipeline

- [ ] Configure GitHub Actions for backend deployment
  - [ ] Add GitHub Secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_SSH_PORT)
  - [ ] Test deployment workflow (.github/workflows/deploy-ionos.yml)
  - [ ] Verify tests run before deployment
  - [ ] Verify Prisma migrations run automatically
- [ ] Set up SSH key authentication for deployments
- [ ] Test manual deployment script (ops/deploy.sh)

### 7.4 Development Environment

- [ ] Optional: Create Dockerfile for backend local development
- [ ] Optional: Create docker-compose.yml for local Postgres + backend
- [ ] Document local development setup in README
  - [ ] How to run backend locally
  - [ ] How to run frontend locally
  - [ ] How to run database migrations

### 7.5 Monitoring & Maintenance

- [ ] Set up uptime monitoring (UptimeRobot or similar)
  - [ ] Monitor https://api.makebelieveimprints.co.uk/health
  - [ ] Alert on downtime > 2 minutes
- [ ] Configure PM2 to restart on server reboot
  - [ ] pm2 startup systemd
  - [ ] pm2 save
- [ ] Test Royal Mail API fallback procedures
  - [ ] Monthly drill: simulate API failure
  - [ ] Practice manual label generation
  - [ ] Verify ops/ROYAL_MAIL_FALLBACK.md is up to date
- [ ] Schedule regular security updates
  - [ ] Weekly: sudo apt update && sudo apt upgrade
  - [ ] Monthly: review dependency updates (npm outdated)

## 8. Documentation

- [ ] Write developer onboarding docs
- [ ] Document API endpoints and data models
      -- [ ] Add usage guides for customization features and templates
- [ ] Maintain coding standards and tech stack docs

## 9. QA & Launch

- [ ] Achieve 60%+ test coverage on critical paths
  - [ ] Integration tests for all API endpoints
  - [ ] E2E tests for critical user journeys (registration, ordering, tracking)
  - [ ] Unit tests for complex business logic
- [ ] Pass all integration and E2E tests
- [ ] Conduct security audit
  - [ ] Input validation on all API endpoints (Zod/Joi schemas)
  - [ ] Rate limiting configured (100 req/15min per IP)
  - [ ] JWT authentication secure (refresh token rotation)
  - [ ] File upload security (type/size validation, signed URLs)
  - [ ] CORS properly configured (Vercel domain only)
  - [ ] Helmet.js security headers active
- [ ] Performance testing and optimization
  - [ ] Load test API endpoints (simulate 100 concurrent users)
  - [ ] Database query optimization (verify all indexes in place)
  - [ ] Frontend performance (Lighthouse score > 90)
  - [ ] Image optimization working (Vercel automatic optimization)
- [ ] Pre-launch checklist
  - [ ] All environment variables configured in production
  - [ ] SSL certificates active on both domains
  - [ ] Database backups configured and tested
  - [ ] Monitoring and alerts active (UptimeRobot)
  - [ ] Royal Mail API credentials valid and tested
  - [ ] Admin dashboard accessible
  - [ ] Test order flow end-to-end in production
- [ ] Launch
  - [ ] Deploy backend to IONOS VPS
  - [ ] Deploy frontend to Vercel (automatic)
  - [ ] Submit mobile apps to App Store and Google Play
  - [ ] Announce launch
- [ ] Post-launch monitoring
  - [ ] Monitor error logs (PM2, Vercel)
  - [ ] Track success metrics (order completion rate, API response times)
  - [ ] Gather user feedback
  - [ ] Iterate based on metrics and feedback

---

**Legend:**

- [ ] Not started
- [ ] In progress
- [ ] Completed

Update this file as you progress through each step.
