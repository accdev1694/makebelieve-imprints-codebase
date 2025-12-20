/**
 * Custom error classes for consistent error handling
 * Each error includes HTTP status code and error type
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorType: string;

  constructor(
    message: string,
    statusCode: number,
    errorType: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Invalid input or validation error
 */
export class ValidationError extends AppError {
  public readonly errors?: Record<string, string[]>;

  constructor(message: string, errors?: Record<string, string[]>) {
    super(message, 400, 'ValidationError');
    this.errors = errors;
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UnauthorizedError');
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'ForbiddenError');
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NotFoundError');
  }
}

/**
 * 409 Conflict - Duplicate resource or conflict
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'ConflictError');
  }
}

/**
 * 422 Unprocessable Entity - Request understood but cannot be processed
 */
export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(message, 422, 'UnprocessableError');
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429, 'RateLimitError');
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'InternalServerError', false);
  }
}

/**
 * 503 Service Unavailable - External service unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'ServiceUnavailableError');
  }
}
