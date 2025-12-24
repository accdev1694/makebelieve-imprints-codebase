# Vercel Deployment Setup Guide

## Architecture Update (December 2024)

**The backend has been merged into the frontend!** The API now runs as Next.js API routes,
eliminating the need for a separate backend server. Everything runs on Vercel's free tier.

## Prerequisites
- GitHub repository pushed to remote
- Vercel account (sign up at https://vercel.com)
- Neon PostgreSQL database (already configured)

## Step 1: Import Project to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Import your GitHub repository: `accdev1694/makebelieve-imprints-codebase`
4. Configure project settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend/` (IMPORTANT!)
   - **Build Command:** `npx prisma generate && npm run build`
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)
   - **Node.js Version:** 20.x

## Step 2: Configure Environment Variables

In the Vercel project settings, add these environment variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-withered-glade-abbc5zjm-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require` | All |
| `JWT_SECRET` | Your secret key (min 32 chars) | All |
| `JWT_REFRESH_SECRET` | Your refresh secret key (min 32 chars) | All |

### How to Add Environment Variables:
1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add each variable above
3. Ensure they apply to Production, Preview, and Development
4. Click **Save**

## Step 3: Update Build Command

In Vercel settings, update the build command to include Prisma:
```
npx prisma generate && npm run build
```

## Step 4: Configure Custom Domain

1. Go to **Settings** → **Domains**
2. Add domain: `makebelieveimprints.co.uk`
3. In IONOS DNS, add:
   - `A` record: `@` → `76.76.21.21`
   - `CNAME` record: `www` → `cname.vercel-dns.com`
4. Wait for DNS propagation (up to 48 hours)

## Step 5: Verify Deployment

After setup:
1. Push changes to trigger deployment
2. Check the deployment URL
3. Test authentication (register/login)
4. Test products page loads

## Current Status

- ✅ Backend merged into frontend (API routes)
- ✅ Neon PostgreSQL configured
- ✅ Environment files ready
- ⏳ Update Vercel environment variables
- ⏳ Configure custom domain

## API Endpoints (Now Built-in)

All API routes are now at `/api/*`:
- `/api/auth/*` - Authentication
- `/api/products/*` - Products
- `/api/categories/*` - Categories
- `/api/orders/*` - Orders
- `/api/designs/*` - Designs
- `/api/uploads/*` - File uploads
