import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { ZodError } from 'zod';

/**
 * Error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    errors?: Record<string, string[]>;
    stack?: string;
  };
}

/**
 * Global error handling middleware
 * Catches all errors and formats them consistently
 * Must be placed after all routes
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Log error for debugging
  console.error('Error:', {
    type: err.constructor.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationErrors: Record<string, string[]> = {};

    err.errors.forEach((error) => {
      const path = error.path.join('.');
      if (!validationErrors[path]) {
        validationErrors[path] = [];
      }
      validationErrors[path].push(error.message);
    });

    const response: ErrorResponse = {
      success: false,
      error: {
        type: 'ValidationError',
        message: 'Validation failed',
        errors: validationErrors,
      },
    };

    res.status(400).json(response);
    return;
  }

  // Handle custom application errors
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        type: err.errorType,
        message: err.message,
      },
    };

    // Include validation errors if present
    if (err instanceof ValidationError && err.errors) {
      response.error.errors = err.errors;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.error.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Prisma errors
  if (err.constructor.name.includes('Prisma')) {
    handlePrismaError(err, res);
    return;
  }

  // Handle all other errors as 500 Internal Server Error
  const response: ErrorResponse = {
    success: false,
    error: {
      type: 'InternalServerError',
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(500).json(response);
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(err: any, res: Response): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      type: 'DatabaseError',
      message: 'Database operation failed',
    },
  };

  // P2002: Unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    response.error.message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    res.status(409).json(response);
    return;
  }

  // P2025: Record not found
  if (err.code === 'P2025') {
    response.error.type = 'NotFoundError';
    response.error.message = 'Record not found';
    res.status(404).json(response);
    return;
  }

  // P2003: Foreign key constraint violation
  if (err.code === 'P2003') {
    response.error.message = 'Related record not found';
    res.status(400).json(response);
    return;
  }

  // Default database error
  if (process.env.NODE_ENV === 'development') {
    response.error.message = err.message;
    response.error.stack = err.stack;
  }

  res.status(500).json(response);
}

/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 * Place before error handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  res.status(404).json({
    success: false,
    error: {
      type: 'NotFoundError',
      message: `Route ${req.method} ${req.url} not found`,
    },
  });
}

/**
 * Async route handler wrapper
 * Catches async errors and passes them to error middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
