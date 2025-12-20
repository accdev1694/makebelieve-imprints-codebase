# Cost Optimization Strategy

## Development Phase: $0/month (Months 1-4)

### Free Services Stack

```yaml
Frontend: Vercel Hobby (Free)
  - 100GB bandwidth/month
  - Automatic deployments from GitHub
  - Preview deployments on PRs
  - URL: https://mkbl.vercel.app

Backend: Railway Free Tier OR Local
  - Railway: $5 credit/month (enough for small backend)
  - Local: npm run dev at http://localhost:4000
  - Auto-deploy from GitHub (Railway)

Database: Neon Serverless Postgres (Free)
  - 512MB storage
  - Autosuspends after 5min inactivity
  - Sign up: https://neon.tech

Object Storage: Cloudflare R2 (Free) OR Local
  - 10GB storage/month
  - No egress fees
  - S3-compatible API
  - Alternative: Local filesystem during dev

Royal Mail API: Mock Service
  - Return fake tracking numbers for testing
  - No API costs during development

Version Control: GitHub (Free)
  - Unlimited private repos
  - GitHub Actions: 2000 min/month

SSL: Let's Encrypt (Free)
Monitoring: UptimeRobot (Free - 50 monitors)
```

**Total Development Cost: $0/month**

---

## Production Phase: When to Pay

### Phase 1: Pre-Launch Testing (Month 5) - €25/month

**Migrate when:**
- Ready for beta testing with real users
- Need 24/7 uptime (no cold starts)
- Database exceeds 500MB
- Need to test Royal Mail API with real shipments

**Services:**
- Frontend: Vercel Hobby (still FREE)
- Backend: IONOS VPS Small (€10/month)
- Database: IONOS Managed PostgreSQL (€10/month)
- Storage: IONOS Object Storage (€5/month)
- Royal Mail: Test mode (minimal costs)

---

### Phase 2: Production Launch (Month 6+) - €40-50/month

**Add:**
- Custom domain: €15/year (makebelieveimprints.com)
- Vercel Pro (optional): $20/month if need custom domain features
- App Store accounts: $99 Apple + $25 Google (one-time)

**Total Launch Cost:**
- Monthly: €40-50/month
- One-time: $124 (app stores)

---

## Free Development Setup Guide

### 1. Frontend (Vercel Hobby)

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
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
# Or during local dev: http://localhost:4000
```

---

### 2. Backend (Railway Free Tier)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
cd backend
railway init
railway up

# Add PostgreSQL
railway add
# Select: PostgreSQL
# Copy DATABASE_URL from dashboard
```

**Alternative: Local Development**
```bash
cd backend
npm install
npm run dev  # Runs on http://localhost:4000
```

---

### 3. Database (Neon Free Tier)

```bash
# Sign up at https://neon.tech
# Create new project → Get connection string

# backend/.env.development
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# Run migrations
npx prisma migrate dev
```

**Features:**
- 512MB storage (enough for dev/testing)
- Autosuspends after 5min (reactivates instantly)
- Branching support (create test databases)

---

### 4. Object Storage (Cloudflare R2 Free)

```bash
# Sign up at https://dash.cloudflare.com
# Workers & Pages → R2 → Create Bucket

# Get credentials from R2 dashboard
```

**backend/.env.development:**
```bash
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=mkbl-uploads-dev
```

**Alternative: Local filesystem during development**
```typescript
// backend/src/services/storage.service.ts
const isDev = process.env.NODE_ENV === 'development';

async function uploadFile(file: File) {
  if (isDev) {
    // Save locally
    const uploadDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, file.name), file.buffer);
    return { url: `http://localhost:4000/uploads/${file.name}` };
  } else {
    // Use R2/S3 in production
    return uploadToS3(file);
  }
}
```

---

### 5. Royal Mail API (Mock Service)

```typescript
// backend/src/services/royal-mail.service.ts
const isProd = process.env.NODE_ENV === 'production';

export class RoyalMailService {
  async createShipment(order: Order) {
    if (!isProd) {
      // Return mock data during development
      return {
        trackingNumber: `RM${Date.now()}GB`,
        labelUrl: 'http://localhost:4000/mock-label.pdf',
        cost: 3.50,
        carrier: 'Royal Mail'
      };
    }

    // Real API call in production
    return this.callRoyalMailAPI(order);
  }
}
```

---

## Migration Triggers

### When to Migrate from Free to Paid

| Trigger | Action | Cost Impact |
|---------|--------|-------------|
| Database >500MB | Migrate to IONOS Managed PostgreSQL | +€10/month |
| Storage >10GB | Migrate to IONOS Object Storage | +€5/month |
| Need 24/7 uptime | Migrate backend to IONOS VPS | +€10/month |
| Ready for beta testing | Enable all paid services | +€25/month |
| Ready to launch | Add custom domain | +€15/year |
| App ready for stores | Submit iOS/Android | +$124 one-time |
| Traffic >100GB/month | Upgrade Vercel to Pro | +$20/month |

---

## Vercel vs IONOS Split: Final Decision

### Keep the Split Architecture ✅

**Why:**

1. **Cost Savings at Scale:**
   - All Vercel: $85-229/month
   - Vercel + IONOS: $38-97/month
   - **Save $47-132/month = $564-1,584/year**

2. **Better for Capacitor:**
   - Static Next.js export required for mobile apps
   - Vercel perfect for static hosting (free + global CDN)
   - Backend must be separate anyway

3. **No Timeout Limits:**
   - IONOS VPS has no function timeout limits
   - Royal Mail API integration works reliably
   - Can run background jobs, cron tasks

4. **Predictable Costs:**
   - IONOS VPS is fixed monthly fee
   - No surprise bills from traffic spikes
   - Easier to budget

5. **Future-Proof:**
   - Can add Redis, workers, queues
   - Full control over backend architecture
   - Easy to scale vertically or horizontally

**Trade-off:**
- Slightly more DevOps work (worth it for savings)
- Need to manage VPS (but you'd need it for Capacitor anyway)

---

## Cost Comparison: Real Scenarios

### Scenario 1: Launch (1K orders/month, 10K visitors)

**All Vercel:**
- Vercel Pro: $20
- Serverless functions: $40
- Vercel Postgres: $20
- Vercel Blob: $5
- **Total: $85/month**

**Vercel + IONOS (Recommended):**
- Vercel Hobby: $0
- IONOS VPS: €10 ($11)
- IONOS Postgres: €10 ($11)
- IONOS Storage: €5 ($5.50)
- **Total: $27.50/month**

**Monthly Savings: $57.50 = $690/year**

---

### Scenario 2: Growth (10K orders/month, 100K visitors)

**All Vercel:**
- Vercel Pro: $20
- Serverless functions: $120 (high invocations)
- Vercel Postgres: $69 (24GB)
- Vercel Blob: $20
- **Total: $229/month**

**Vercel + IONOS (Recommended):**
- Vercel Pro: $20 (for features)
- IONOS VPS (larger): €20 ($22)
- IONOS Postgres: €20 ($22)
- IONOS Storage: €10 ($11)
- **Total: $75/month**

**Monthly Savings: $154 = $1,848/year**

---

## Recommended Timeline

**Months 1-4: Development ($0/month)**
- Use all free tiers
- Build features, test locally
- Deploy to Vercel + Railway for sharing

**Month 5: Pre-Launch Testing (€25/month)**
- Migrate backend to IONOS VPS
- Migrate database to IONOS
- Test with real Royal Mail API
- Keep Vercel Hobby free tier

**Month 6: Launch (€40/month + $124)**
- Buy custom domain
- Submit to app stores
- Add IONOS Object Storage
- Optionally upgrade Vercel to Pro

**Year 2+: Scale (€50-100/month)**
- Increase VPS size as needed
- Scale database vertically
- Add Redis for caching
- Monitor and optimize

---

## Free Alternatives Reference

| Paid Service | Free Alternative | Limit | Migration Point |
|-------------|------------------|-------|-----------------|
| IONOS VPS | Railway Free | $5 credit/month | Need 24/7 uptime |
| IONOS VPS | Render Free | 750 hrs/month | Production ready |
| IONOS VPS | Local dev | Unlimited | Need to share |
| IONOS Postgres | Neon Free | 512MB | Database >500MB |
| IONOS Postgres | Supabase Free | 500MB | Database >500MB |
| IONOS Postgres | Local PostgreSQL | Unlimited | Need cloud access |
| IONOS Storage | Cloudflare R2 Free | 10GB/month | Storage >10GB |
| IONOS Storage | Backblaze B2 Free | 10GB | Storage >10GB |
| IONOS Storage | Local filesystem | Unlimited | Need cloud access |
| Custom Domain | Vercel subdomain | Free forever | Want branding |
| Vercel Pro | Vercel Hobby | 100GB bandwidth | Traffic >100GB |
| Royal Mail API | Mock service | Unlimited | Ready for shipping |
| App Stores | TestFlight/Internal | 100 testers | Public launch |

---

## Summary

**Development (Months 1-4): FREE**
- Vercel Hobby + Railway Free + Neon Free + R2 Free
- Mock Royal Mail API
- Total: $0/month

**Pre-Launch (Month 5): €25/month**
- Migrate backend, database, storage to IONOS
- Keep Vercel free tier
- Test Royal Mail integration

**Production (Month 6+): €40-75/month**
- Add custom domain
- Submit to app stores ($124 one-time)
- Scale as needed

**Total Cost to Launch: ~€150-200 ($165-220)**
vs. $450-600 if paying from day 1

**Savings: 60%+ by using free tiers during development**
