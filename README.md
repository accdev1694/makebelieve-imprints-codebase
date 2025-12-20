# MakeBelieve Imprints

Single-printer custom print service platform with mobile apps.

## Architecture

- **Frontend:** Next.js 15 + React + Tailwind CSS (Vercel)
- **Backend:** Node.js 22 + Express + Prisma (IONOS VPS)
- **Database:** PostgreSQL 16 (Neon free tier → IONOS Managed)
- **Storage:** S3-compatible Object Storage (Cloudflare R2 → IONOS)
- **Mobile:** Capacitor 6 for iOS/Android app stores

## Development Cost

**Months 1-4:** $0/month (free tiers)
**Month 5+:** €25-50/month (production infrastructure)

See `base/COST_OPTIMIZATION.md` for detailed strategy.

## Tech Stack

- **Frontend:** Next.js 15, React 18, TypeScript 5, Tailwind CSS 3
- **Backend:** Express 4, Prisma 6, JWT authentication
- **Mobile:** Capacitor 6 (iOS/Android native apps)
- **Deployment:** Vercel (frontend) + IONOS VPS (backend)

## Project Structure

```
mkbl/
├── base/                   # Architecture & planning docs
│   ├── tech-stack.md
│   ├── architecture.md
│   ├── data-models.md
│   ├── coding-standards.md
│   ├── progress.md
│   ├── COST_OPTIMIZATION.md
│   ├── epic-1.md through epic-5.md
│   └── mood.md
├── ops/                    # Deployment & operations
│   ├── deploy.sh
│   ├── DEPLOYMENT.md
│   ├── ROYAL_MAIL_FALLBACK.md
│   ├── nginx-site.conf
│   └── pm2.ecosystem.config.js
├── .github/workflows/      # CI/CD pipelines
│   └── deploy-ionos.yml
├── frontend/               # Next.js app (TBD)
└── backend/                # Express API (TBD)
```

## Documentation

### Planning
- `base/tech-stack.md` - Technology decisions with justifications
- `base/architecture.md` - System architecture and infrastructure
- `base/data-models.md` - Database schema (SQL + Prisma)
- `base/coding-standards.md` - Development guidelines and best practices
- `base/progress.md` - Implementation checklist
- `base/COST_OPTIMIZATION.md` - Cost strategy and free tier setup
- `base/epic-1.md` through `epic-5.md` - Feature implementation plans
- `base/mood.md` - Design system (colors, typography, brand)

### Operations
- `ops/DEPLOYMENT.md` - Complete deployment guide (Vercel + IONOS)
- `ops/ROYAL_MAIL_FALLBACK.md` - Royal Mail API fallback procedures
- `ops/deploy.sh` - Backend deployment script
- `ops/nginx-site.conf` - Nginx reverse proxy configuration
- `ops/pm2.ecosystem.config.js` - PM2 process management

## Development Setup (Coming Soon)

Frontend and backend setup instructions will be added after initialization.

See `base/COST_OPTIMIZATION.md` for free tier service setup (Vercel, Railway, Neon, Cloudflare R2).

## Status

🎯 **Phase:** Architecture Complete
🚧 **Next:** Initialize frontend and backend codebases
📅 **Started:** December 2024

## Key Decisions

✅ **Vercel + IONOS split architecture** (55-70% cheaper at scale)
✅ **Capacitor-only mobile strategy** (no PWA)
✅ **JWT authentication** (stateless, no sessions)
✅ **Free tier development** ($0/month for months 1-4)
✅ **Pragmatic testing** (60%+ coverage on critical paths)

## Success Metrics

- 70% fun rating from customers
- 4.5+ star average rating
- 95% on-time delivery rate
- Sub-2 second page load times

---

**Architecture documentation is complete. Ready to begin implementation.**
