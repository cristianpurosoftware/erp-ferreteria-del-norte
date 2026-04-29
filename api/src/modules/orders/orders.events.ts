export const OrderEvents = {
  CREATED: 'order.created',
  SUBMITTED: 'order.submitted',
  CONFIRMED: 'order.confirmed',
  REJECTED: 'order.rejected',
  STOCK_RESERVED: 'order.stock_reserved',
  PREPARATION_STARTED: 'order.preparation_started',
  READY_TO_DISPATCH: 'order.ready_to_dispatch',
  DISPATCHED: 'order.dispatched',
  DELIVERED: 'order.delivered',
  COMPLETED: 'order.completed',
  CANCELLED: 'order.cancelled',
  BLOCKED_BY_CREDIT: 'order.blocked_by_credit',
} as const;
