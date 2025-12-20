# Source Tree

```
makebelieve-imprints-codebase/
├── frontend/                 # Next.js application
│   ├── app/                  # App Router pages
│   │   ├── (auth)/           # Authentication pages
│   │   ├── about/            # About the printer page
│   │   ├── customize/        # customization tools
│   │   └── dashboard/        # Customer and admin dashboards
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Utilities (API clients, helpers)
│   ├── public/               # Static assets (images, fonts, manifest.json)
│   ├── next.config.mjs       # Next.js configuration (with PWA plugin)
│   └── capacitor.config.ts   # Capacitor configuration
├── backend/                  # Express.js API
│   ├── src/
│   │   ├── routes/           # API endpoints (users, orders, etc.)
│   │   ├── services/         # Business logic (payments, royalmail-service.ts)
│   │   ├── models/           # Prisma models
│   │   └── middleware/       # Auth, validation
│   ├── prisma/               # Database schema and migrations
│   └── tests/                # Unit tests
...existing code...
├── shared/                   # Shared code/types
│   ├── types/                # TypeScript interfaces
│   └── constants/            # Enums, configs
├── database/                 # DB scripts and seeds
├── docs/                     # Architecture docs, API specs
├── tests/                    # E2E tests
├── docker/                   # Container configs (for local dev and VPS builds)
├── .github/workflows/        # CI/CD pipelines
└── package.json              # Root dependencies
```

**Organization Principles:** Modular monorepo with shared types for consistency. Frontend/backend separation for scalability. Personalization is provided via templates and user uploads. Deployment targets are IONOS (Web Hosting, Cloud VPS, and Object Storage).
