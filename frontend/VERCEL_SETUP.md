# Vercel Deployment Setup Guide

## Prerequisites
- GitHub repository pushed to remote
- Vercel account (sign up at https://vercel.com)

## Step 1: Import Project to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Import your GitHub repository: `accdev1694/makebelieve-imprints-codebase`
4. Configure project settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend/` (IMPORTANT!)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)
   - **Node.js Version:** 22.x

## Step 2: Configure Environment Variables

In the Vercel project settings, add the following environment variable:

**For Development Preview:**
- Key: `NEXT_PUBLIC_API_URL`
- Value: `http://localhost:4000` (for preview branches to test locally)

**For Production:**
- Key: `NEXT_PUBLIC_API_URL`
- Value: `https://api.makebelieveimprints.com` (once backend is deployed to IONOS)

### How to Add Environment Variables:
1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add `NEXT_PUBLIC_API_URL`
3. Set the value based on environment (Production/Preview/Development)
4. Click **Save**

## Step 3: Enable Automatic Deployments

Automatic deployments are enabled by default when you import from GitHub:

- **Main branch:** Deploys to production automatically
- **Other branches:** Deploy to preview URLs automatically
- **Pull requests:** Create preview deployments

## Step 4: Configure Custom Domain (Optional - for later)

Once ready for production:
1. Go to **Settings** → **Domains**
2. Add domain: `makebelieveimprints.com`
3. Follow Vercel's DNS configuration instructions
4. Wait for DNS propagation (can take up to 48 hours)

## Step 5: Verify Deployment

After setup:
1. Vercel will automatically deploy your main branch
2. Check the deployment URL (e.g., `https://mkbl.vercel.app`)
3. Verify the app loads correctly
4. Check browser console for any environment variable issues

## Current Status

- ✅ Environment files created (`.env.local`, `.env.example`)
- ✅ Frontend ready for deployment
- ⏳ Waiting for manual Vercel project setup
- ⏳ Backend deployment to IONOS (for production API URL)

## Next Steps After Vercel Setup

Once Vercel is configured:
1. Test the preview deployment
2. Update API URL when backend is deployed
3. Configure custom domain when ready for launch
