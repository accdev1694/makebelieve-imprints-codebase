# Development Environment Setup Guide

This guide walks you through setting up the free development infrastructure for MakeBelieve Imprints.

**Total Cost: $0/month** (All services use free tiers)

---

## 1. Vercel (Frontend Hosting)

**Service:** Vercel Hobby Plan (Free)

### Steps:

1. **Sign up at [vercel.com](https://vercel.com)**
   - Use your GitHub account for easy integration

2. **Import the project:**
   - Click "Add New Project"
   - Select your GitHub repository
   - **Important:** Set root directory to `frontend/`

3. **Configure build settings:**
   - Framework Preset: Next.js (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)

4. **Add environment variables:**
   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```
   (Update this to your deployed backend URL later)

5. **Deploy:**
   - Click "Deploy"
   - Get your free URL: `https://your-project.vercel.app`
   - Automatic deployments will trigger on every push to main

### Free Tier Limits:
- 100GB bandwidth/month
- Unlimited deployments
- Automatic HTTPS
- Global CDN

---

## 2. Neon Database (PostgreSQL)

**Service:** Neon Serverless Postgres (Free)

### Steps:

1. **Sign up at [neon.tech](https://neon.tech)**

2. **Create a new project:**
   - Project name: `makebelieve-imprints-dev`
   - Region: Choose closest to you (e.g., `US East (Ohio)` or `EU (Frankfurt)`)
   - Postgres version: 16 (latest)

3. **Get connection string:**
   - Copy the connection string from the dashboard
   - It looks like: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

4. **Add to backend/.env:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your DATABASE_URL
   ```

5. **Test connection:**
   ```bash
   cd backend
   npx prisma db push
   ```

### Free Tier Limits:
- 512MB storage (sufficient for development)
- Auto-suspends after 5 minutes of inactivity (instant wake-up)
- 1 project, 10 branches
- Perfect for development and testing

---

## 3. Backend Development (Local)

**Recommendation:** Run backend locally during development

### Steps:

1. **Create .env file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Update .env with your Neon database URL:**
   ```
   DATABASE_URL="your-neon-connection-string"
   ```

3. **Run database migrations:**
   ```bash
   npm run prisma:migrate
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Verify it's running:**
   - Open http://localhost:4000
   - Check health endpoint: http://localhost:4000/health

### Alternative: Railway Free Tier
If you prefer a deployed backend during development:
1. Sign up at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Select the `backend/` directory
4. Add environment variables
5. $5 free credit per month

---

## 4. File Storage (Development)

**Option A: Local Filesystem (Recommended for dev)**

No setup needed! Files will be stored in `backend/uploads/` directory.

**Option B: Cloudflare R2 (S3-compatible)**

If you want to test S3-compatible storage:

1. **Sign up at [cloudflare.com](https://cloudflare.com)**
2. **Navigate to R2 Object Storage**
3. **Create bucket:**
   - Name: `mkbl-uploads-dev`
   - Region: Automatic
4. **Generate API tokens:**
   - Navigate to "Manage R2 API Tokens"
   - Create API token with read/write permissions
5. **Add to backend/.env:**
   ```
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_BUCKET=mkbl-uploads-dev
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   ```

### Free Tier Limits:
- 10GB storage/month
- 1 million Class A operations/month
- 10 million Class B operations/month

---

## 5. Royal Mail API (Mock Service)

During development, we use a **mock Royal Mail service** that returns fake tracking numbers.

✅ **Already implemented** - See `backend/src/services/royalmail-mock.service.ts`

No setup or API costs required during development!

---

## Quick Start Checklist

- [ ] Sign up for Vercel and deploy frontend
- [ ] Sign up for Neon and create database
- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Add Neon DATABASE_URL to `backend/.env`
- [ ] Run `npm run prisma:migrate` in backend
- [ ] Start backend with `npm run dev`
- [ ] Start frontend with `npm run dev` (already running)
- [ ] Test both services are running

---

## Verification

Once everything is set up:

1. **Frontend:** https://your-project.vercel.app (or http://localhost:3000)
2. **Backend:** http://localhost:4000/health
3. **Database:** Connected via Neon (check with `npx prisma studio`)

---

## Need Help?

- **Vercel:** [docs.vercel.com](https://vercel.com/docs)
- **Neon:** [neon.tech/docs](https://neon.tech/docs)
- **Prisma:** [prisma.io/docs](https://www.prisma.io/docs)

---

**Next Steps:** After setup is complete, continue with Section 2 of progress.md (Backend Implementation).
