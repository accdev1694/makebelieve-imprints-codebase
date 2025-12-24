# Coding Standards

## Languages and Frameworks

- **Primary:** TypeScript 5.3+ for type safety across frontend and backend
- **Frontend:** Next.js 15.x (App Router), React 18.3+, Tailwind CSS
- **Backend:** Node.js 22.x LTS, Express.js 4.x, Prisma 6.x
- **Mobile:** Capacitor 6.x for native iOS/Android builds
- **Secondary:** SQL (PostgreSQL 16.x), Markdown for documentation

## Naming Conventions

- **Variables/Functions:** camelCase (e.g., `getUserOrders`, `isAuthenticated`)
- **Classes/Types/Interfaces:** PascalCase (e.g., `UserService`, `OrderDTO`)
- **Files/Directories:** kebab-case (e.g., `user-service.ts`, `api-client/`)
- **Database Tables/Columns:** snake_case (e.g., `user_id`, `created_at`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `API_BASE_URL`)
- **React Components:** PascalCase files and exports (e.g., `OrderCard.tsx` exports `OrderCard`)
- **Prisma Models:** PascalCase singular (e.g., `User`, `Order`, `RefreshToken`)

## Code Organization

### Frontend Structure
```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth-protected routes
│   ├── api/               # API routes (if any)
│   └── layout.tsx         # Root layout
├── components/            # Reusable React components
│   ├── ui/               # Generic UI components
│   └── features/         # Feature-specific components
├── lib/                   # Utilities and helpers
│   ├── api-client.ts     # Backend API client
│   ├── auth.ts           # Auth utilities
│   └── utils.ts          # Common utilities
└── public/               # Static assets
```

### Backend Structure
```
backend/
├── src/
│   ├── routes/           # Express route handlers
│   ├── services/         # Business logic
│   ├── middleware/       # Express middleware
│   ├── utils/            # Helper functions
│   ├── types/            # TypeScript type definitions
│   └── index.ts          # Application entry point
└── prisma/
    └── schema.prisma     # Database schema
```

## Error Handling

### Backend
- **Custom Errors:** Extend `Error` with custom error classes
  ```typescript
  class NotFoundError extends Error {
    statusCode = 404;
    constructor(message: string) {
      super(message);
      this.name = 'NotFoundError';
    }
  }
  ```
- **Centralized Middleware:** Single error handler in Express
  ```typescript
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });
  ```
- **Error Types:** `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ConflictError`

### Frontend
- **Error Boundaries:** Wrap route segments in React Error Boundaries
- **Toast Notifications:** Use toast library for user-facing errors
- **Logging:** Log errors to monitoring service (Sentry, LogRocket, etc.)

## Testing Strategy

### Pragmatic Testing Approach
Focus on critical paths over coverage percentages. Test what matters for business success.

### Backend Testing
- **Integration Tests (Priority):** Test API endpoints with Supertest
  - Authentication flow (login, register, token refresh)
  - Order creation and status updates
  - Royal Mail API integration (with mocks)
- **Unit Tests (As Needed):** Test complex business logic in services
  - Payment calculations
  - Template rendering logic
- **Coverage Goal:** 60%+ on critical paths, not 80% everywhere

### Frontend Testing
- **E2E Tests (Priority):** Cypress for critical user journeys
  - User registration and login
  - Design upload and customization
  - Order placement and tracking
- **Component Tests (As Needed):** Jest + React Testing Library for complex components
  - Form validation
  - State management
- **Coverage Goal:** E2E tests for happy paths, unit tests for edge cases

### Test Data
- Use factories (e.g., `factory.ts`) for consistent test data generation
- Seed database with realistic data for local development
- Mock external APIs (Royal Mail) in tests

## Security

### Authentication (JWT)
- **Access Tokens:** Short-lived (15 minutes), stored in httpOnly cookies or Authorization header
- **Refresh Tokens:** Long-lived (7 days), stored in database with rotation
- **Password Hashing:** bcrypt with cost factor 12
- **Token Signing:** Use RS256 (public/private key) for production, HS256 acceptable for development

### Input Validation
- **Backend:** Validate all inputs with Zod or Joi schemas
  ```typescript
  const createOrderSchema = z.object({
    designId: z.string().uuid(),
    shippingAddress: z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      postalCode: z.string().regex(/^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$/i),
    }),
  });
  ```
- **Frontend:** Basic validation for UX, rely on backend for security

### API Security
- **Rate Limiting:** 100 requests/15min per IP (use `express-rate-limit`)
- **CORS:** Whitelist only Vercel frontend domain
- **Helmet.js:** Security headers (CSP, X-Frame-Options, etc.)
- **HTTPS Only:** Enforce TLS in production (Nginx config)

### File Upload Security
- **Type Validation:** Check MIME type and file extension
- **Size Limits:** Max 10MB per file
- **Virus Scanning:** Integrate ClamAV or similar (optional for MVP)
- **Signed URLs:** Use S3 presigned URLs for direct uploads

## Code Quality

### Linting and Formatting
- **ESLint:** Enforce coding standards, catch bugs
- **Prettier:** Auto-format on save (consistent style)
- **Husky:** Pre-commit hooks run linter and tests
- **Configuration:** Extend from `@typescript-eslint/recommended`, `next/core-web-vitals`

### Type Safety
- **Strict Mode:** Enable `strict: true` in tsconfig.json
- **No `any`:** Avoid `any` type, use `unknown` or generics
- **Shared Types:** Define DTOs for API contracts shared between frontend/backend
  ```typescript
  // shared-types.ts
  export interface CreateOrderDTO {
    designId: string;
    shippingAddress: ShippingAddress;
  }
  ```

### Code Reviews
- All code requires review before merging
- Check for: security issues, test coverage, type safety, code clarity
- Keep PRs small (<500 lines changed)

## Version Control

### Git Workflow
- **Branching:** Feature branches from `main` (e.g., `feature/order-tracking`)
- **Commits:** Use Conventional Commits format
  - `feat: add order tracking endpoint`
  - `fix: resolve JWT expiration bug`
  - `docs: update deployment guide`
  - `refactor: extract payment logic to service`
- **Merging:** Squash and merge to keep `main` history clean
- **Protection:** `main` branch requires PR + passing CI

### Commit Best Practices
- Small, focused commits (single logical change)
- Write descriptive commit messages (explain why, not just what)
- Reference issue numbers: `fix: handle Royal Mail timeout (#42)`

## Performance

### Frontend
- **Image Optimization:** Use Next.js `<Image>` component (automatic optimization via Vercel)
- **Code Splitting:** Dynamic imports for large components
  ```typescript
  const DesignEditor = dynamic(() => import('@/components/DesignEditor'), { ssr: false });
  ```
- **Caching:** Leverage Next.js caching strategies (ISR not available with Capacitor static export)

### Backend
- **Database Queries:** Use Prisma query optimization, add indexes
- **Caching:** Cache expensive operations (template rendering) in memory or Redis
- **Pagination:** Always paginate list endpoints (e.g., orders, designs)
  ```typescript
  const orders = await prisma.order.findMany({
    take: 20,
    skip: (page - 1) * 20,
    orderBy: { createdAt: 'desc' },
  });
  ```

## Documentation

### Code Comments
- **When to Comment:**
  - Complex algorithms or business logic
  - Non-obvious workarounds
  - Security-critical sections
- **When NOT to Comment:** Self-explanatory code (prefer clear naming over comments)

### API Documentation
- Use JSDoc for function signatures
  ```typescript
  /**
   * Creates a new order for a customer
   * @param userId - The customer's user ID
   * @param orderData - Order details (design, shipping, etc.)
   * @returns The created order with tracking info
   * @throws {ValidationError} If order data is invalid
   * @throws {NotFoundError} If design doesn't exist
   */
  async function createOrder(userId: string, orderData: CreateOrderDTO): Promise<Order> {
    // ...
  }
  ```
- Consider OpenAPI/Swagger for API documentation (optional)

### README Files
- Project root: Setup instructions, environment variables
- Each major directory: Purpose and organization

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
JWT_ACCESS_SECRET="random-secret-key"
JWT_REFRESH_SECRET="different-random-secret"
IONOS_S3_ENDPOINT="https://s3.ionos.com"
IONOS_S3_ACCESS_KEY="..."
IONOS_S3_SECRET_KEY="..."
ROYAL_MAIL_API_KEY="..."
NODE_ENV="production"
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL="https://api.makebelieveimprints.co.uk"
NEXT_PUBLIC_SENTRY_DSN="..." # Optional
```

**Security:** Never commit `.env` files. Use `.env.example` templates.
