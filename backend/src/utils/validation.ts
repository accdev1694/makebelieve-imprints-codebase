import { Request, Response, NextFunction } from 'express';
import { ZodSchema, z } from 'zod';

/**
 * Validate request body against Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate request query parameters against Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate request params against Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /**
   * UUID parameter validation
   */
  uuidParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  /**
   * Pagination query validation
   */
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /**
   * Email validation
   */
  email: z.string().email('Invalid email format'),

  /**
   * Password validation (min 8 characters)
   */
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters'),

  /**
   * Date range validation
   */
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
};

/**
 * Auth-specific validation schemas
 */
export const authSchemas = {
  register: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  }),

  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required'),
  }),
};
