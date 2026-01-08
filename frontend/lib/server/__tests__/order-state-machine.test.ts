import { mockReset, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, OrderStatus } from '@prisma/client';

// Mock prisma - must export as named 'prisma' to match the actual module
jest.mock('@/lib/prisma', () => {
  const mock = jest.requireActual('jest-mock-extended').mockDeep();
  return {
    __esModule: true,
    prisma: mock,
  };
});

import { prisma as prismaImport } from '@/lib/prisma';
const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

import {
  VALID_TRANSITIONS,
  STATUS_LABELS,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
  CANCELLABLE_STATUSES,
  REFUNDABLE_STATUSES,
  isValidTransition,
  getValidNextStatuses,
  validateTransition,
  transitionOrderStatus,
  canCustomerRequestCancellation,
  canBeRefunded,
  isTerminalStatus,
  isActiveStatus,
} from '../order-state-machine';

describe('Order State Machine', () => {
  beforeEach(() => {
    mockReset(prisma);
  });

  describe('VALID_TRANSITIONS configuration', () => {
    it('should allow pending orders to be payment_confirmed or cancelled', () => {
      expect(VALID_TRANSITIONS.pending).toContain('payment_confirmed');
      expect(VALID_TRANSITIONS.pending).toContain('cancelled');
      expect(VALID_TRANSITIONS.pending).not.toContain('shipped');
    });

    it('should allow payment_confirmed to progress to confirmed or be cancelled/refunded', () => {
      expect(VALID_TRANSITIONS.payment_confirmed).toContain('confirmed');
      expect(VALID_TRANSITIONS.payment_confirmed).toContain('cancelled');
      expect(VALID_TRANSITIONS.payment_confirmed).toContain('refunded');
    });

    it('should prevent transitions from terminal states', () => {
      expect(VALID_TRANSITIONS.cancelled).toEqual([]);
      expect(VALID_TRANSITIONS.refunded).toEqual([]);
    });

    it('should allow delivered orders only to be refunded', () => {
      expect(VALID_TRANSITIONS.delivered).toEqual(['refunded']);
    });
  });

  describe('STATUS_LABELS', () => {
    it('should have human-readable labels for all statuses', () => {
      expect(STATUS_LABELS.pending).toBe('Pending Payment');
      expect(STATUS_LABELS.delivered).toBe('Delivered');
      expect(STATUS_LABELS.refunded).toBe('Refunded');
    });
  });

  describe('isValidTransition', () => {
    it('should return true for valid transitions', () => {
      expect(isValidTransition('pending', 'payment_confirmed')).toBe(true);
      expect(isValidTransition('confirmed', 'printing')).toBe(true);
      expect(isValidTransition('shipped', 'delivered')).toBe(true);
    });

    it('should return true for no-op transitions (same status)', () => {
      expect(isValidTransition('pending', 'pending')).toBe(true);
      expect(isValidTransition('delivered', 'delivered')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(isValidTransition('pending', 'shipped')).toBe(false);
      expect(isValidTransition('delivered', 'pending')).toBe(false);
      expect(isValidTransition('cancelled', 'confirmed')).toBe(false);
    });

    it('should not allow backwards transitions', () => {
      expect(isValidTransition('shipped', 'printing')).toBe(false);
      expect(isValidTransition('delivered', 'shipped')).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return valid next statuses for pending', () => {
      const nextStatuses = getValidNextStatuses('pending');
      expect(nextStatuses).toContain('payment_confirmed');
      expect(nextStatuses).toContain('cancelled');
    });

    it('should return empty array for terminal statuses', () => {
      expect(getValidNextStatuses('cancelled')).toEqual([]);
      expect(getValidNextStatuses('refunded')).toEqual([]);
    });
  });

  describe('validateTransition', () => {
    it('should return valid for allowed transitions', () => {
      const result = validateTransition('pending', 'payment_confirmed');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for no-op transitions', () => {
      const result = validateTransition('confirmed', 'confirmed');
      expect(result.valid).toBe(true);
    });

    it('should return error for terminal state transitions', () => {
      const result = validateTransition('cancelled', 'confirmed');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('terminal state');
    });

    it('should return error with valid options for invalid transitions', () => {
      const result = validateTransition('pending', 'shipped');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot transition');
      expect(result.error).toContain('Valid transitions');
    });
  });

  describe('transitionOrderStatus', () => {
    it('should successfully transition order status', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        status: 'pending' as OrderStatus,
      } as Parameters<typeof prisma.order.findUnique>[0] extends { where: infer W } ? { id: string; status: OrderStatus } : never);
      prisma.order.update.mockResolvedValue({} as Parameters<typeof prisma.order.update>[0] extends { data: infer D } ? D : never);

      const result = await transitionOrderStatus('order-123', 'payment_confirmed');

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('pending');
      expect(result.newStatus).toBe('payment_confirmed');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { status: 'payment_confirmed' },
      });
    });

    it('should return error for non-existent order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      const result = await transitionOrderStatus('non-existent', 'confirmed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order not found');
    });

    it('should reject invalid transition without force flag', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        status: 'pending' as OrderStatus,
      } as Parameters<typeof prisma.order.findUnique>[0] extends { where: infer W } ? { id: string; status: OrderStatus } : never);

      const result = await transitionOrderStatus('order-123', 'shipped');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot transition');
    });

    it('should allow invalid transition with force flag', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        status: 'pending' as OrderStatus,
      } as Parameters<typeof prisma.order.findUnique>[0] extends { where: infer W } ? { id: string; status: OrderStatus } : never);
      prisma.order.update.mockResolvedValue({} as Parameters<typeof prisma.order.update>[0] extends { data: infer D } ? D : never);

      const result = await transitionOrderStatus('order-123', 'shipped', { force: true });

      expect(result.success).toBe(true);
      expect(prisma.order.update).toHaveBeenCalled();
    });

    it('should skip update for no-op transition', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        status: 'confirmed' as OrderStatus,
      } as Parameters<typeof prisma.order.findUnique>[0] extends { where: infer W } ? { id: string; status: OrderStatus } : never);

      const result = await transitionOrderStatus('order-123', 'confirmed');

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('confirmed');
      expect(result.newStatus).toBe('confirmed');
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('should apply additional updates atomically', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        status: 'confirmed' as OrderStatus,
      } as Parameters<typeof prisma.order.findUnique>[0] extends { where: infer W } ? { id: string; status: OrderStatus } : never);
      prisma.order.update.mockResolvedValue({} as Parameters<typeof prisma.order.update>[0] extends { data: infer D } ? D : never);

      const result = await transitionOrderStatus('order-123', 'printing', {
        additionalUpdates: { printStartedAt: new Date() },
      });

      expect(result.success).toBe(true);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          status: 'printing',
          printStartedAt: expect.any(Date),
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      prisma.order.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const result = await transitionOrderStatus('order-123', 'confirmed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('canCustomerRequestCancellation', () => {
    it('should return true for cancellable statuses', () => {
      expect(canCustomerRequestCancellation('pending')).toBe(true);
      expect(canCustomerRequestCancellation('payment_confirmed')).toBe(true);
      expect(canCustomerRequestCancellation('confirmed')).toBe(true);
    });

    it('should return false for non-cancellable statuses', () => {
      expect(canCustomerRequestCancellation('printing')).toBe(false);
      expect(canCustomerRequestCancellation('shipped')).toBe(false);
      expect(canCustomerRequestCancellation('delivered')).toBe(false);
    });
  });

  describe('canBeRefunded', () => {
    it('should return true for refundable statuses', () => {
      expect(canBeRefunded('payment_confirmed')).toBe(true);
      expect(canBeRefunded('confirmed')).toBe(true);
      expect(canBeRefunded('delivered')).toBe(true);
    });

    it('should return false for non-refundable statuses', () => {
      expect(canBeRefunded('pending')).toBe(false);
      expect(canBeRefunded('cancelled')).toBe(false);
      expect(canBeRefunded('refunded')).toBe(false);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for terminal statuses', () => {
      expect(isTerminalStatus('delivered')).toBe(true);
      expect(isTerminalStatus('cancelled')).toBe(true);
      expect(isTerminalStatus('refunded')).toBe(true);
    });

    it('should return false for non-terminal statuses', () => {
      expect(isTerminalStatus('pending')).toBe(false);
      expect(isTerminalStatus('printing')).toBe(false);
    });
  });

  describe('isActiveStatus', () => {
    it('should return true for active statuses', () => {
      expect(isActiveStatus('pending')).toBe(true);
      expect(isActiveStatus('printing')).toBe(true);
      expect(isActiveStatus('cancellation_requested')).toBe(true);
    });

    it('should return false for inactive statuses', () => {
      expect(isActiveStatus('delivered')).toBe(false);
      expect(isActiveStatus('cancelled')).toBe(false);
      expect(isActiveStatus('refunded')).toBe(false);
    });
  });

  describe('Status categories', () => {
    it('should have ACTIVE_STATUSES and TERMINAL_STATUSES as mutually exclusive', () => {
      const overlap = ACTIVE_STATUSES.filter((s) => TERMINAL_STATUSES.includes(s));
      expect(overlap).toHaveLength(0);
    });

    it('should include all statuses in either ACTIVE or TERMINAL', () => {
      const allStatuses = Object.keys(VALID_TRANSITIONS) as OrderStatus[];
      const categorized = [...ACTIVE_STATUSES, ...TERMINAL_STATUSES];

      allStatuses.forEach((status) => {
        expect(categorized).toContain(status);
      });
    });
  });
});
