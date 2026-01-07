/**
 * Circuit Breaker Tests
 */

import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerError,
  CircuitBreakerTimeoutError,
  getCircuitBreaker,
  getAllCircuitBreakerStats,
  resetAllCircuitBreakers,
  clearAllCircuitBreakers,
  withCircuitBreaker,
} from '../circuit-breaker';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 3,
      resetTimeout: 100, // Short for testing
      successThreshold: 2,
      timeout: 50,
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should be available initially', () => {
      expect(breaker.isAvailable()).toBe(true);
    });

    it('should have zero stats initially', () => {
      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('successful requests', () => {
    it('should execute and return result', async () => {
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should track successful requests', async () => {
      await breaker.execute(async () => 'ok');
      await breaker.execute(async () => 'ok');

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.totalSuccesses).toBe(2);
    });

    it('should reset failure count on success', async () => {
      // Cause some failures
      for (let i = 0; i < 2; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      // Then succeed
      await breaker.execute(async () => 'ok');

      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
    });
  });

  describe('failed requests', () => {
    it('should track failures', async () => {
      await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});

      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
      expect(stats.totalFailures).toBe(1);
    });

    it('should open circuit after threshold failures', async () => {
      // Cause failures up to threshold
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should throw CircuitBreakerError when open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      await expect(breaker.execute(async () => 'ok')).rejects.toThrow(CircuitBreakerError);
    });
  });

  describe('timeout handling', () => {
    it('should timeout slow requests', async () => {
      const slowFn = () => new Promise<string>((resolve) => {
        setTimeout(() => resolve('slow'), 100);
      });

      await expect(breaker.execute(slowFn)).rejects.toThrow(CircuitBreakerTimeoutError);
    });

    it('should count timeout as failure', async () => {
      const slowFn = () => new Promise<string>((resolve) => {
        setTimeout(() => resolve('slow'), 100);
      });

      await breaker.execute(slowFn).catch(() => {});

      const stats = breaker.getStats();
      expect(stats.totalFailures).toBe(1);
    });
  });

  describe('circuit state transitions', () => {
    it('should transition CLOSED -> OPEN on failures', async () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should transition OPEN -> HALF_OPEN after timeout', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next call should transition to HALF_OPEN
      await breaker.execute(async () => 'ok');
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should transition HALF_OPEN -> CLOSED on success threshold', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Succeed enough times to close
      await breaker.execute(async () => 'ok');
      await breaker.execute(async () => 'ok');

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition HALF_OPEN -> OPEN on failure', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // First call succeeds (transitions to HALF_OPEN)
      await breaker.execute(async () => 'ok');
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Then fail
      await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('callbacks', () => {
    it('should call onOpen when circuit opens', async () => {
      const onOpen = jest.fn();
      const cb = new CircuitBreaker({
        name: 'callback-test',
        failureThreshold: 2,
        resetTimeout: 100,
        successThreshold: 1,
        timeout: 50,
        onOpen,
      });

      for (let i = 0; i < 2; i++) {
        await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      expect(onOpen).toHaveBeenCalledWith('callback-test', expect.any(Error));
    });

    it('should call onClose when circuit closes', async () => {
      const onClose = jest.fn();
      const cb = new CircuitBreaker({
        name: 'callback-test',
        failureThreshold: 1,
        resetTimeout: 50,
        successThreshold: 1,
        timeout: 100,
        onClose,
      });

      // Open circuit
      await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});

      // Wait and recover
      await new Promise((resolve) => setTimeout(resolve, 100));
      await cb.execute(async () => 'ok');

      expect(onClose).toHaveBeenCalledWith('callback-test');
    });

    it('should call onHalfOpen when entering half-open', async () => {
      const onHalfOpen = jest.fn();
      const cb = new CircuitBreaker({
        name: 'callback-test',
        failureThreshold: 1,
        resetTimeout: 50,
        successThreshold: 2,
        timeout: 100,
        onHalfOpen,
      });

      // Open circuit
      await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});

      // Wait and try again
      await new Promise((resolve) => setTimeout(resolve, 100));
      await cb.execute(async () => 'ok');

      expect(onHalfOpen).toHaveBeenCalledWith('callback-test');
    });
  });

  describe('reset', () => {
    it('should reset circuit to CLOSED state', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Reset
      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getStats().failures).toBe(0);
    });
  });
});

describe('Circuit Breaker Registry', () => {
  beforeEach(() => {
    clearAllCircuitBreakers();
  });

  afterEach(() => {
    clearAllCircuitBreakers();
  });

  describe('getCircuitBreaker', () => {
    it('should create new circuit breaker for unknown service', () => {
      const cb = getCircuitBreaker('new-service');
      expect(cb).toBeInstanceOf(CircuitBreaker);
    });

    it('should return same instance for same service', () => {
      const cb1 = getCircuitBreaker('test-service');
      const cb2 = getCircuitBreaker('test-service');
      expect(cb1).toBe(cb2);
    });

    it('should use default config for known services', () => {
      const stripeCb = getCircuitBreaker('stripe');
      const stats = stripeCb.getStats();
      expect(stats.name).toBe('stripe');
    });

    it('should allow custom config override', () => {
      const cb = getCircuitBreaker('custom', { failureThreshold: 10 });
      expect(cb).toBeDefined();
    });
  });

  describe('getAllCircuitBreakerStats', () => {
    it('should return stats for all breakers', () => {
      getCircuitBreaker('service-1');
      getCircuitBreaker('service-2');

      const stats = getAllCircuitBreakerStats();
      expect(stats.length).toBe(2);
      expect(stats.map((s) => s.name)).toContain('service-1');
      expect(stats.map((s) => s.name)).toContain('service-2');
    });
  });

  describe('resetAllCircuitBreakers', () => {
    it('should reset all breakers', async () => {
      const cb1 = getCircuitBreaker('service-1', {
        failureThreshold: 1,
        resetTimeout: 1000,
        successThreshold: 1,
        timeout: 100,
      });

      // Open circuit
      await cb1.execute(async () => { throw new Error('fail'); }).catch(() => {});
      expect(cb1.getState()).toBe(CircuitState.OPEN);

      // Reset all
      resetAllCircuitBreakers();

      expect(cb1.getState()).toBe(CircuitState.CLOSED);
    });
  });
});

describe('withCircuitBreaker helper', () => {
  beforeEach(() => {
    clearAllCircuitBreakers();
  });

  afterEach(() => {
    clearAllCircuitBreakers();
  });

  it('should execute function through circuit breaker', async () => {
    const result = await withCircuitBreaker('helper-test', async () => 'success');
    expect(result).toBe('success');
  });

  it('should use fallback when circuit is open', async () => {
    const cb = getCircuitBreaker('fallback-test', {
      failureThreshold: 1,
      resetTimeout: 10000,
      successThreshold: 1,
      timeout: 100,
    });

    // Open circuit
    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});

    // Use fallback
    const result = await withCircuitBreaker(
      'fallback-test',
      async () => 'primary',
      { fallback: () => 'fallback-value' }
    );

    expect(result).toBe('fallback-value');
  });

  it('should throw if no fallback and circuit is open', async () => {
    const cb = getCircuitBreaker('no-fallback-test', {
      failureThreshold: 1,
      resetTimeout: 10000,
      successThreshold: 1,
      timeout: 100,
    });

    // Open circuit
    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});

    await expect(
      withCircuitBreaker('no-fallback-test', async () => 'primary')
    ).rejects.toThrow(CircuitBreakerError);
  });
});

describe('CircuitBreakerError', () => {
  it('should contain service name and state', () => {
    const error = new CircuitBreakerError('test message', 'my-service', CircuitState.OPEN);

    expect(error.message).toBe('test message');
    expect(error.serviceName).toBe('my-service');
    expect(error.state).toBe(CircuitState.OPEN);
    expect(error.name).toBe('CircuitBreakerError');
  });
});

describe('CircuitBreakerTimeoutError', () => {
  it('should contain service name and timeout', () => {
    const error = new CircuitBreakerTimeoutError('timeout message', 'slow-service', 5000);

    expect(error.message).toBe('timeout message');
    expect(error.serviceName).toBe('slow-service');
    expect(error.timeout).toBe(5000);
    expect(error.name).toBe('CircuitBreakerTimeoutError');
  });
});
