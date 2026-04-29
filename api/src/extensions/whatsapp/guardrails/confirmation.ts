/**
 * Guardrail: Confirmation before critical actions
 * The AI agent must confirm with the user before creating orders or making changes.
 */
export function requiresConfirmation(action: string): boolean {
  const criticalActions = ['create_order', 'cancel_order', 'register_payment'];
  return criticalActions.includes(action);
}

export function formatConfirmation(action: string, details: Record<string, any>): string {
  // Format a human-readable confirmation message
  // TODO: Implement per action type
  return `Confirma que quieres ${action}?`;
}
