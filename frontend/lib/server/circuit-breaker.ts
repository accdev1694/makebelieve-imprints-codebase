/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascade failures by stopping requests to failing external services.
 * Implements the standard three-state pattern:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests fail fast without calling the service
 * - HALF_OPEN: Testing recovery, allows limited requests through
 *
 * Usage:
 *   const breaker = getCircuitBreaker('stripe');
 *   const result = await breaker.execute(() => stripe.refunds.create(...));
 */

import { logger } from './logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  /** Name for logging and identification */
  name: string;
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Time in ms before attempting recovery (default: 30000 = 30s) */
  resetTimeout: number;
  /** Number of successful calls in HALF_OPEN before closing circuit (default: 2) */
  successThreshold: number;
  /** Request timeout in ms (default: 10000 = 10s) */
  timeout: number;
  /** Optional callback when circuit opens */
  onOpen?: (name: string, error: Error) => void;
  /** Optional callback when circuit closes */
  onClose?: (name: string) => void;
  /** Optional callback when circuit goes half-open */
  onHalfOpen?: (name: string) => void;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

const DEFAULT_CONFIG: Omit<CircuitBreakerConfig, 'name'> = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 2,
  timeout: 10000, // 10 seconds
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private nextAttempt: Date | null = null;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> & { name: string }) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker '${this.config.name}' is OPEN`,
          this.config.name,
          this.state
        );
      }
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Execute function with timeout protection
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new CircuitBreakerTimeoutError(
          `Request timed out after ${this.config.timeout}ms`,
          this.config.name,
          this.config.timeout
        ));
      }, this.config.timeout);

      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else {
      // Reset failure count on success in CLOSED state
      this.failures = 0;
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(error: Error): void {
    this.lastFailureTime = new Date();
    this.totalFailures++;
    this.failures++;

    logger.warn(`Circuit breaker '${this.config.name}' recorded failure`, {
      failures: this.failures,
      threshold: this.config.failureThreshold,
      state: this.state,
      error: error.message,
    });

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN immediately opens the circuit
      this.transitionTo(CircuitState.OPEN);
    } else if (this.failures >= this.config.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttempt) return false;
    return new Date() >= this.nextAttempt;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    logger.info(`Circuit breaker '${this.config.name}' state change`, {
      from: oldState,
      to: newState,
    });

    switch (newState) {
      case CircuitState.OPEN:
        this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
        this.successes = 0;
        this.config.onOpen?.(this.config.name, new Error('Circuit opened due to failures'));
        break;

      case CircuitState.HALF_OPEN:
        this.successes = 0;
        this.config.onHalfOpen?.(this.config.name);
        break;

      case CircuitState.CLOSED:
        this.failures = 0;
        this.successes = 0;
        this.nextAttempt = null;
        this.config.onClose?.(this.config.name);
        break;
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      name: this.config.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailureTime,
      lastSuccess: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually reset the circuit breaker (for testing or admin override)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = null;
    logger.info(`Circuit breaker '${this.config.name}' manually reset`);
  }

  /**
   * Check if circuit is allowing requests
   */
  isAvailable(): boolean {
    if (this.state === CircuitState.CLOSED) return true;
    if (this.state === CircuitState.HALF_OPEN) return true;
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) return true;
    return false;
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly serviceName: string,
    public readonly state: CircuitState
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Error thrown when request times out
 */
export class CircuitBreakerTimeoutError extends Error {
  constructor(
    message: string,
    public readonly serviceName: string,
    public readonly timeout: number
  ) {
    super(message);
    this.name = 'CircuitBreakerTimeoutError';
  }
}

// ============================================
// Global Circuit Breaker Registry
// ============================================

const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Default configurations for known services
 */
const SERVICE_CONFIGS: Record<string, Partial<CircuitBreakerConfig>> = {
  stripe: {
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 2,
    timeout: 15000, // Stripe can be slow
  },
  wise: {
    failureThreshold: 5,
    resetTimeout: 60000, // Wise API can have longer outages
    successThreshold: 3,
    timeout: 20000,
  },
  'royal-mail': {
    failureThreshold: 3, // Royal Mail API is less reliable
    resetTimeout: 60000,
    successThreshold: 2,
    timeout: 30000, // Label generation can be slow
  },
  r2: {
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 2,
    timeout: 30000, // File uploads can be slow
  },
  resend: {
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 2,
    timeout: 10000,
  },
};

/**
 * Get or create a circuit breaker for a service
 */
export function getCircuitBreaker(
  serviceName: string,
  customConfig?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    const defaultConfig = SERVICE_CONFIGS[serviceName] || {};
    const config = {
      name: serviceName,
      ...defaultConfig,
      ...customConfig,
    };
    circuitBreakers.set(serviceName, new CircuitBreaker(config));
  }
  return circuitBreakers.get(serviceName)!;
}

/**
 * Get statistics for all circuit breakers
 */
export function getAllCircuitBreakerStats(): CircuitBreakerStats[] {
  return Array.from(circuitBreakers.values()).map((cb) => cb.getStats());
}

/**
 * Reset all circuit breakers (for testing)
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.forEach((cb) => cb.reset());
}

/**
 * Clear all circuit breakers (for testing)
 */
export function clearAllCircuitBreakers(): void {
  circuitBreakers.clear();
}

/**
 * Wrapper function to execute with circuit breaker protection
 * Provides a simpler API for one-off protected calls
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  options?: { fallback?: () => T | Promise<T> }
): Promise<T> {
  const breaker = getCircuitBreaker(serviceName);

  try {
    return await breaker.execute(fn);
  } catch (error) {
    if (error instanceof CircuitBreakerError && options?.fallback) {
      logger.warn(`Circuit breaker '${serviceName}' using fallback`, {
        state: error.state,
      });
      return options.fallback();
    }
    throw error;
  }
}
