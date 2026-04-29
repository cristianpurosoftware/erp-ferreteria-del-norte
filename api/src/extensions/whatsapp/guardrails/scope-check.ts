/**
 * Guardrail: Scope check
 * Verify the AI agent only operates within its allowed scope.
 */
export const ALLOWED_SCOPES = [
  'catalog:read',
  'stock:read',
  'orders:read',
  'orders:create',
  'orders:status',
  'account:read',
  'customer_history:read',
] as const;

export function isWithinScope(action: string): boolean {
  return ALLOWED_SCOPES.includes(action as any);
}
