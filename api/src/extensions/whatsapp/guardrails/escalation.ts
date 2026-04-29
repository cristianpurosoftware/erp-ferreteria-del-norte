/**
 * Guardrail: Escalation
 * Detect when the AI agent should escalate to a human operator.
 */
export const ESCALATION_TRIGGERS = [
  'complaint',
  'refund',
  'large_order', // orders above a threshold
  'credit_issue',
  'unknown_request',
] as const;

export function shouldEscalate(context: { intent?: string; orderTotal?: number; threshold?: number }): boolean {
  if (context.intent && ESCALATION_TRIGGERS.includes(context.intent as any)) {
    return true;
  }
  if (context.orderTotal && context.threshold && context.orderTotal > context.threshold) {
    return true;
  }
  return false;
}
