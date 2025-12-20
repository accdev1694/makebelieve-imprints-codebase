import { Router, Request, Response } from 'express';
import {
  register,
  login,
  refreshAccessToken,
  logout,
} from '../services/auth.service';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, authSchemas } from '../utils/validation';
import { UnauthorizedError, ConflictError } from '../utils/errors';
import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * Cookie configuration for tokens
 */
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevents XSS attacks
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict' as const, // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authLimiter, // Strict rate limiting for auth endpoints
  validateBody(authSchemas.register),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    try {
      // Register user
      const result = await register({ email, password, name });

      // Set tokens in httpOnly cookies
      res.cookie('accessToken', result.tokens.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      res.cookie('refreshToken', result.tokens.refreshToken, COOKIE_OPTIONS);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Email already registered') {
        throw new ConflictError(error.message);
      }
      throw error;
    }
  })
);

/**
 * POST /api/auth/login
 * Login a user
 */
router.post(
  '/login',
  authLimiter, // Strict rate limiting for auth endpoints
  validateBody(authSchemas.login),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      // Login user
      const result = await login({ email, password });

      // Set tokens in httpOnly cookies
      res.cookie('accessToken', result.tokens.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      res.cookie('refreshToken', result.tokens.refreshToken, COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid email or password') {
        throw new UnauthorizedError(error.message);
      }
      throw error;
    }
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    // Refresh tokens
    const tokens = await refreshAccessToken(refreshToken);

    // Set new tokens in httpOnly cookies
    res.cookie('accessToken', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
    });
  })
);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await logout(refreshToken);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

export default router;
