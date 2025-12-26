# Cost Optimization Strategy

## Architecture: Vercel-Only Deployment

All services run on free tiers or low-cost managed services:
- **Frontend + API:** Vercel (free tier)
- **Database:** Neon Serverless Postgres (free tier)
- **Storage:** Cloudflare R2 (free tier)
- **Domain:** IONOS (DNS only)

---

## Development Phase: $0/month

### Free Services Stack

```yaml
Frontend + API: Vercel Hobby (Free)
  - 100GB bandwidth/month
  - Automatic deployments from GitHub
  - Preview deployments on PRs
  - Serverless API routes
  - URL: https://mkbl.vercel.app

Database: Neon Serverless Postgres (Free)
  - 512MB storage
  - Autosuspends after 5min inactivity
  - Database branching for testing
  - Sign up: https://neon.tech

Object Storage: Cloudflare R2 (Free)
  - 10GB storage/month
  - No egress fees
  - S3-compatible API
  - Sign up: https://dash.cloudflare.com

Royal Mail API: Mock Service
  - Return fake tracking numbers for testing
  - No API costs during development

Version Control: GitHub (Free)
  - Unlimited private repos
  - GitHub Actions: 2000 min/month

SSL: Automatic via Vercel (Free)
Monitoring: Vercel Analytics (Free tier)
```

**Total Development Cost: $0/month**

---

## Production Phase: $0-20/month

### When to Upgrade

| Trigger | Action | Cost Impact |
|---------|--------|-------------|
| Need custom domain | Configure IONOS DNS → Vercel | ~$15/year |
| Traffic >100GB/month | Upgrade Vercel to Pro | +$20/month |
| Database >512MB | Upgrade Neon plan | +$19/month |
| Storage >10GB | R2 usage-based pricing | Minimal |
| App ready for stores | Submit iOS/Android | +$124 one-time |

---

## Free Development Setup Guide

### 1. Frontend + API (Vercel Hobby)

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git push origin main

# Connect to Vercel
# Visit vercel.com → Import Project
# Select: frontend/ directory
# Framework: Next.js
# Deploy

# Get free URL: https://mkbl.vercel.app
```

**Environment Variables (Vercel Dashboard):**
```bash
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=mkbl-uploads
JWT_SECRET=your-jwt-secret
```

---

### 2. Database (Neon Free Tier)

```bash
# Sign up at https://neon.tech
# Create new project → Get connection string

# .env.local
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# Run migrations
npx prisma migrate dev
```

**Features:**
- 512MB storage (enough for dev/testing)
- Autosuspends after 5min (reactivates instantly)
- Branching support (create test databases)

---

### 3. Object Storage (Cloudflare R2 Free)

```bash
# Sign up at https://dash.cloudflare.com
# Workers & Pages → R2 → Create Bucket

# Get credentials from R2 dashboard
```

**.env.local:**
```bash
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=mkbl-uploads
```

---

### 4. Royal Mail API (Mock Service)

```typescript
// lib/services/royal-mail.ts
const isProd = process.env.NODE_ENV === 'production';

export async function createShipment(order: Order) {
  if (!isProd) {
    // Return mock data during development
    return {
      trackingNumber: `RM${Date.now()}GB`,
      labelUrl: '/mock-label.pdf',
      cost: 3.50,
      carrier: 'Royal Mail'
    };
  }

  // Real API call in production
  return callRoyalMailAPI(order);
}
```

---

## Cost Comparison

### Launch (1K orders/month, 10K visitors)

**Vercel-Only Stack:**
- Vercel Hobby: $0
- Neon Free: $0
- Cloudflare R2 Free: $0
- IONOS Domain: ~$15/year
- **Total: ~$1.25/month**

### Growth (10K orders/month, 100K visitors)

**Vercel-Only Stack:**
- Vercel Pro: $20/month
- Neon Pro: $19/month
- Cloudflare R2: ~$5/month (usage-based)
- IONOS Domain: ~$15/year
- **Total: ~$45/month**

---

## Recommended Timeline

**Months 1-4: Development ($0/month)**
- Use all free tiers
- Build features, test locally
- Deploy to Vercel for previews

**Month 5: Pre-Launch Testing ($0/month)**
- Test with real Royal Mail API
- Beta testing with real users
- Still using free tiers

**Month 6: Launch (~$15/year + $124)**
- Configure custom domain
- Submit to app stores
- Monitor for upgrade triggers

**Year 2+: Scale ($20-50/month)**
- Upgrade Vercel/Neon as needed
- Add monitoring tools
- Optimize performance

---

## Free Alternatives Reference

| Service | Free Option | Limit | Upgrade Trigger |
|---------|-------------|-------|-----------------|
| Hosting | Vercel Hobby | 100GB bandwidth | Traffic spikes |
| Database | Neon Free | 512MB | Data growth |
| Storage | Cloudflare R2 | 10GB/month | Large uploads |
| Domain | Vercel subdomain | Free forever | Want branding |
| Royal Mail | Mock service | Unlimited | Ready to ship |
| App Stores | TestFlight/Internal | 100 testers | Public launch |

---

## Summary

**Development: FREE**
- Vercel Hobby + Neon Free + R2 Free
- Mock Royal Mail API
- Total: $0/month

**Production: $0-45/month**
- Same stack, upgrade tiers as needed
- Custom domain: ~$15/year
- App stores: $124 one-time

**Total Cost to Launch: ~$140**
(Domain + App Store fees)

**Benefits of Vercel-Only:**
- Zero infrastructure management
- Automatic scaling
- Single deployment (frontend + API)
- Preview deployments for every PR
- No VPS, PM2, or nginx to maintain
