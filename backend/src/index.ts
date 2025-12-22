import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import designsRoutes from './routes/designs.routes';
import ordersRoutes from './routes/orders.routes';
import reviewsRoutes from './routes/reviews.routes';
import invoicesRoutes from './routes/invoices.routes';
import paymentsRoutes from './routes/payments.routes';
import shippingRoutes from './routes/shipping.routes';
import uploadsRoutes from './routes/uploads.routes';
import productsRoutes from './routes/products.routes';
import variantsRoutes from './routes/variants.routes';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/error.middleware';
import { apiLimiter } from './middleware/rate-limit.middleware';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resource sharing
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'http://localhost:3000', 'http://localhost:4000'], // Allow images from both origins
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https:', 'data:'],
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
// Skip JSON parsing for raw file upload endpoint
app.use((req, res, next) => {
  if (req.path === '/api/uploads/proxy') {
    return next();
  }
  express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies for JWT auth

// Rate limiting - Apply to all API routes
app.use('/api/', apiLimiter);

// Serve uploaded files from local storage (for development)
if (process.env.USE_LOCAL_STORAGE === 'true') {
  const uploadsDir = process.env.LOCAL_STORAGE_DIR || './uploads';
  app.use('/uploads', express.static(uploadsDir));
  console.log(`📁 Serving static files from ${uploadsDir} at /uploads`);
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/designs', designsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api', variantsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/uploads', uploadsRoutes);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'MakeBelieve Imprints API',
    version: '0.1.0',
    docs: '/api/docs',
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler); // 404 handler
app.use(errorHandler); // Global error handler

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});

export default app;
