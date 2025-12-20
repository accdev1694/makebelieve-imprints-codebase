# MakeBelieve Imprints - Backend

Express.js backend API for MakeBelieve Imprints custom print service.

## Tech Stack

- **Runtime:** Node.js 22.x
- **Framework:** Express 4.x
- **Language:** TypeScript 5.x (strict mode)
- **Database:** PostgreSQL 16 (via Prisma ORM)
- **Authentication:** JWT (stateless)
- **Security:** Helmet, CORS, rate limiting

## Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- PostgreSQL database (Neon free tier recommended for development)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your database connection string and other required variables.

### 3. Set up database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations to create database schema
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

### 4. Start development server

```bash
npm run dev
```

The server will start at `http://localhost:4000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Entry point
│   ├── routes/               # API route handlers
│   ├── services/             # Business logic
│   │   └── royalmail-mock.service.ts  # Mock Royal Mail API (dev only)
│   ├── models/               # Data models
│   └── middleware/           # Express middleware
├── prisma/
│   └── schema.prisma         # Database schema
├── tests/                    # Test files
└── dist/                     # Compiled JavaScript (gitignored)
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Users (Coming soon)
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `POST /api/users/refresh` - Refresh access token

### Designs (Coming soon)
- `GET /api/designs` - List user's designs
- `POST /api/designs` - Upload new design
- `GET /api/designs/:id` - Get design details

### Orders (Coming soon)
- `GET /api/orders` - List user's orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/:id/tracking` - Get tracking information

## Development Notes

### Mock Services

During development, we use mock services to avoid external API costs:

- **Royal Mail API:** Uses `royalmail-mock.service.ts` to return fake tracking numbers
- Replace with real implementation in production

### Database

Development uses Neon Serverless Postgres (free tier):
- 512MB storage
- Auto-suspends after 5 minutes of inactivity
- Connection string format: `postgresql://user:pass@host/db?sslmode=require`

### Authentication

- JWT-based stateless authentication
- Access tokens: 15 minute expiry (httpOnly cookies)
- Refresh tokens: 7 day expiry (stored in database with rotation)
- Password hashing: bcrypt with cost factor 12

### Security

- Helmet.js for security headers
- CORS configured for frontend domain only
- Rate limiting: 100 requests per 15 minutes per IP
- Input validation using Zod schemas

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Deployment

See `/ops/DEPLOYMENT.md` for production deployment instructions.

For development, the backend runs locally on `http://localhost:4000`.

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `PORT` - Server port (default: 4000)
- `FRONTEND_URL` - Frontend URL for CORS

## Troubleshooting

### Database connection fails
- Verify DATABASE_URL is correct
- Check if Neon database is active (it auto-suspends)
- Ensure SSL mode is enabled (`sslmode=require`)

### Prisma errors
```bash
# Reset Prisma Client
rm -rf node_modules/.prisma
npm run prisma:generate
```

### Port already in use
```bash
# Change PORT in .env or kill process using port 4000
lsof -ti:4000 | xargs kill -9
```

## Contributing

Follow the coding standards in `/base/coding-standards.md`.

## License

Private - MakeBelieve Imprints
