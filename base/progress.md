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

- [ ] **Vercel Hobby** - Connect GitHub repo to Vercel
  - [ ] Import project, select `frontend/` directory
  - [ ] Get free URL: https://mkbl.vercel.app
- [✅] **Backend** - Choose development approach
  - [✅] Option B: Run locally (`npm run dev`) - SELECTED
  - [ ] Option A: Railway Free Tier (optional for later)
- [ ] **Neon Database** - Sign up at neon.tech
  - [ ] Create project, get connection string
  - [ ] 512MB storage free (sufficient for development)
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
- [ ] Initialize Prisma and define schema based on `data-models.md`
  - [ ] Define User, RefreshToken, Design, Order, Review, UserPreference models
  - [ ] Add all indexes as specified in data-models.md
- [ ] Set up PostgreSQL connection (IONOS Managed PostgreSQL for production)
- [ ] Implement JWT authentication (stateless, no sessions)
  - [ ] Access tokens (15min expiry, httpOnly cookies)
  - [ ] Refresh tokens (7 day expiry, stored in database with rotation)
  - [ ] Password hashing with bcrypt (cost factor 12)
- [ ] Add error handling middleware (custom error classes: ValidationError, NotFoundError, etc.)
- [ ] Implement API routes for users, designs, orders, reviews, preferences
- [ ] Implement Royal Mail Click and Drop API service
  - [ ] Create shipment with retry logic (exponential backoff)
  - [ ] Get tracking status
  - [ ] Health check endpoint
- [ ] Configure IONOS Object Storage (S3-compatible) for file uploads
  - [ ] Implement signed URL generation for secure uploads
- [ ] Add security middleware (Helmet, CORS, rate limiting)
- [ ] Write integration tests for critical API endpoints (Supertest)
  - [ ] Auth flow (login, register, token refresh)
  - [ ] Order creation and status updates
- [ ] Write unit tests for complex business logic (Jest)
  - [ ] Target: 60%+ coverage on critical paths

## 3. Frontend Setup (Next.js + Tailwind)

- [✅] Scaffold Next.js 15.x app in `frontend/` with App Router
- [✅] Configure TypeScript (strict mode) and Tailwind CSS 3.4+
- [ ] Configure Tailwind theme based on `mood.md` design system
  - [ ] Colors, typography, spacing
  - [ ] Custom components for consistent design
- [ ] Set up Vercel project and connect to GitHub
  - [ ] Configure environment variables (NEXT_PUBLIC_API_URL)
  - [ ] Enable automatic deployments on push to main
- [ ] Create reusable UI component library
  - [ ] Buttons, cards, inputs, modals (components/ui/)
  - [ ] Feature-specific components (components/features/)
- [ ] Implement authentication pages (login, register)
  - [ ] JWT token management (store in httpOnly cookies)
  - [ ] Protected route middleware
- [ ] Implement "About the Printer" page
- [ ] Add design customization UI
  - [ ] File upload with drag-and-drop
  - [ ] Template selection and preview
  - [ ] Integration with backend preview endpoints
- [ ] Implement gifting experience UI (emotional previews with templates)
- [ ] Add material selection UI
- [ ] Implement order placement and checkout flow
- [ ] Add order tracking UI (Royal Mail integration)
- [ ] Build customer dashboard
  - [ ] Order history
  - [ ] Saved designs
  - [ ] Account settings
- [ ] Build admin dashboard for printer
  - [ ] Order management (pending, printing, shipped)
  - [ ] Manual Royal Mail label fallback UI
  - [ ] Customer management
- [ ] Configure API client for backend communication
- [ ] Write E2E tests for critical user journeys (Cypress)
  - [ ] User registration and login
  - [ ] Design upload and customization
  - [ ] Order placement and tracking
- [ ] Write component tests for complex UI (Jest + React Testing Library)

## 4. Mobile App (Capacitor)

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

## 5. Customization/Templates

- [ ] Design template library and presets for customization
- [ ] Implement preview endpoints for template rendering
- [ ] Integrate frontend customization flows with backend preview endpoints
- [ ] Write unit tests for preview and customization services

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
  - [ ] NEXT_PUBLIC_API_URL=https://api.makebelieveimprints.com
- [ ] Configure custom domain
  - [ ] Frontend: makebelieveimprints.com
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
  - [ ] Monitor https://api.makebelieveimprints.com/health
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
