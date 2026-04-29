import { describe, it, expect } from 'vitest';
import { canTransition, assertTransition, TransitionMap } from '../../src/common/state-machine';
import { BusinessLogicError } from '../../src/common/errors';

const ORDER_TRANSITIONS: TransitionMap<string> = {
  draft: ['pending_confirmation', 'cancelled'],
  pending_confirmation: ['confirmed', 'rejected'],
  confirmed: ['stock_reserved', 'cancelled'],
  stock_reserved: ['in_preparation', 'cancelled'],
  in_preparation: ['ready_to_dispatch', 'cancelled'],
  ready_to_dispatch: ['dispatched', 'cancelled'],
  dispatched: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  rejected: [],
};

describe('state machine — canTransition', () => {
  it('allows valid forward transitions', () => {
    expect(canTransition(ORDER_TRANSITIONS, 'draft', 'pending_confirmation')).toBe(true);
    expect(canTransition(ORDER_TRANSITIONS, 'confirmed', 'stock_reserved')).toBe(true);
    expect(canTransition(ORDER_TRANSITIONS, 'dispatched', 'delivered')).toBe(true);
  });

  it('blocks skipping intermediate states', () => {
    expect(canTransition(ORDER_TRANSITIONS, 'draft', 'confirmed')).toBe(false);
    expect(canTransition(ORDER_TRANSITIONS, 'confirmed', 'dispatched')).toBe(false);
  });

  it('blocks any transition out of terminal states', () => {
    expect(canTransition(ORDER_TRANSITIONS, 'completed', 'draft')).toBe(false);
    expect(canTransition(ORDER_TRANSITIONS, 'cancelled', 'confirmed')).toBe(false);
    expect(canTransition(ORDER_TRANSITIONS, 'rejected', 'pending_confirmation')).toBe(false);
  });

  it('returns false for unknown source state', () => {
    expect(canTransition(ORDER_TRANSITIONS, 'unknown', 'draft')).toBe(false);
  });
});

describe('state machine — assertTransition', () => {
  it('does not throw on a valid transition', () => {
    expect(() => assertTransition(ORDER_TRANSITIONS, 'draft', 'cancelled', 'order')).not.toThrow();
  });

  it('throws BusinessLogicError with INVALID_STATE_TRANSITION on invalid', () => {
    try {
      assertTransition(ORDER_TRANSITIONS, 'draft', 'completed', 'order');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BusinessLogicError);
      expect((err as BusinessLogicError).code).toBe('INVALID_STATE_TRANSITION');
      expect((err as BusinessLogicError).message).toContain("from 'draft' to 'completed'");
    }
  });

  it('default entityName is "entity"', () => {
    try {
      assertTransition(ORDER_TRANSITIONS, 'draft', 'completed');
      expect.fail('expected throw');
    } catch (err) {
      expect((err as Error).message).toContain('entity');
    }
  });
});
