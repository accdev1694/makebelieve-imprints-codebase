/**
 * Structured logging utility for the application
 *
 * Benefits over raw console.log:
 * - Consistent formatting with timestamps
 * - Log levels (debug, info, warn, error)
 * - Can be disabled/configured per environment
 * - Easy to extend for external logging services (Sentry, LogRocket, etc.)
 * - Satisfies ESLint no-console rule
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Configure minimum log level based on environment
const getMinLogLevel = (): LogLevel => {
  if (process.env.NODE_ENV === 'production') {
    return 'warn'; // Only warn and error in production
  }
  if (process.env.NODE_ENV === 'test') {
    return 'error'; // Only errors in tests
  }
  return 'debug'; // Everything in development
};

const MIN_LOG_LEVEL = getMinLogLevel();

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
};

const formatMessage = (level: LogLevel, module: string, message: string, context?: LogContext): string => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}${contextStr}`;
};

/**
 * Create a logger instance for a specific module/file
 *
 * @example
 * const logger = createLogger('auth-service');
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to authenticate', { error: err.message });
 */
export function createLogger(module: string) {
  return {
    debug: (message: string, context?: LogContext) => {
      if (shouldLog('debug')) {
        // eslint-disable-next-line no-console
        console.debug(formatMessage('debug', module, message, context));
      }
    },

    info: (message: string, context?: LogContext) => {
      if (shouldLog('info')) {
        // eslint-disable-next-line no-console
        console.info(formatMessage('info', module, message, context));
      }
    },

    warn: (message: string, context?: LogContext) => {
      if (shouldLog('warn')) {
        // eslint-disable-next-line no-console
        console.warn(formatMessage('warn', module, message, context));
      }
    },

    error: (message: string, context?: LogContext) => {
      if (shouldLog('error')) {
        // eslint-disable-next-line no-console
        console.error(formatMessage('error', module, message, context));
      }
    },
  };
}

/**
 * Default logger for quick usage without creating an instance
 * Prefer createLogger() for better traceability
 */
export const logger = createLogger('app');

export type Logger = ReturnType<typeof createLogger>;
