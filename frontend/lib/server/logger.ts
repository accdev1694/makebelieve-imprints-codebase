/**
 * Structured Logger Service
 *
 * Production-ready logging with:
 * - JSON format for log aggregation (production)
 * - Pretty format for development
 * - Consistent log levels
 * - Request context tracking
 * - Safe serialization of errors and objects
 *
 * Usage:
 *   import { logger } from '@/lib/server/logger';
 *   logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
 *   logger.error('Payment failed', { orderId: '456', error });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Configuration
const SERVICE_NAME = process.env.SERVICE_NAME || 'mkbl-frontend';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Get current minimum log level
 */
function getMinLevel(): number {
  return LOG_LEVELS[LOG_LEVEL] ?? LOG_LEVELS.info;
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= getMinLevel();
}

/**
 * Safely serialize an error object
 */
function serializeError(error: unknown): { name: string; message: string; stack?: string } | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: IS_PRODUCTION ? undefined : error.stack,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

/**
 * Safely serialize context, handling circular references
 */
function serializeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;

  try {
    // Use JSON parse/stringify to handle circular references
    return JSON.parse(JSON.stringify(context, (key, value) => {
      // Handle special types
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: IS_PRODUCTION ? undefined : value.stack,
        };
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (typeof value === 'function') {
        return '[Function]';
      }
      if (typeof value === 'symbol') {
        return value.toString();
      }
      return value;
    }));
  } catch {
    return { _serializationError: 'Failed to serialize context' };
  }
}

/**
 * Format a log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    // JSON format for production (log aggregators like Datadog, CloudWatch, etc.)
    return JSON.stringify(entry);
  }

  // Pretty format for development
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[90m', // Gray
    info: '\x1b[36m',  // Cyan
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
  };
  const reset = '\x1b[0m';
  const color = levelColors[entry.level];

  let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${JSON.stringify(entry.context)}`;
  }

  if (entry.error) {
    output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
    if (entry.error.stack) {
      output += `\n  ${entry.error.stack}`;
    }
  }

  return output;
}

/**
 * Create a log entry and output it
 */
function log(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: SERVICE_NAME,
    environment: process.env.NODE_ENV || 'development',
    context: serializeContext(context),
    error: serializeError(error),
  };

  const output = formatLogEntry(entry);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      console.debug(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Logger interface
 */
export const logger = {
  /**
   * Debug level - verbose information for debugging
   */
  debug(message: string, context?: LogContext): void {
    log('debug', message, context);
  },

  /**
   * Info level - general operational information
   */
  info(message: string, context?: LogContext): void {
    log('info', message, context);
  },

  /**
   * Warn level - potential issues that don't stop execution
   */
  warn(message: string, context?: LogContext): void {
    log('warn', message, context);
  },

  /**
   * Error level - errors that need attention
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    log('error', message, context, error);
  },

  /**
   * Create a child logger with preset context
   * Useful for request-scoped logging
   */
  child(baseContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        log('debug', message, { ...baseContext, ...context }),
      info: (message: string, context?: LogContext) =>
        log('info', message, { ...baseContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        log('warn', message, { ...baseContext, ...context }),
      error: (message: string, error?: unknown, context?: LogContext) =>
        log('error', message, { ...baseContext, ...context }, error),
    };
  },
};

/**
 * Create a request-scoped logger
 * Includes request ID and other context for tracing
 */
export function createRequestLogger(requestId: string, additionalContext?: LogContext) {
  return logger.child({
    requestId,
    ...additionalContext,
  });
}

/**
 * Log an API request/response
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  context?: LogContext
): void {
  const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  log(level, `${method} ${path} ${statusCode} ${durationMs}ms`, {
    method,
    path,
    statusCode,
    durationMs,
    ...context,
  });
}

/**
 * Log a database query
 */
export function logDatabaseQuery(
  operation: string,
  model: string,
  durationMs: number,
  context?: LogContext
): void {
  log('debug', `DB ${operation} ${model} ${durationMs}ms`, {
    database: true,
    operation,
    model,
    durationMs,
    ...context,
  });
}

/**
 * Log an external API call
 */
export function logExternalApi(
  service: string,
  endpoint: string,
  statusCode: number,
  durationMs: number,
  context?: LogContext
): void {
  const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  log(level, `External API ${service} ${endpoint} ${statusCode} ${durationMs}ms`, {
    external: true,
    service,
    endpoint,
    statusCode,
    durationMs,
    ...context,
  });
}

export default logger;
