export const FiscalAuthorizationEvents = {
  LOGGED: 'fiscal.authorization_logged',
  GRANTED: 'invoice.cae_received',
  REJECTED: 'invoice.cae_rejected',
  REQUESTED: 'invoice.cae_requested',
} as const;
