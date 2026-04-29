import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface HttpContext {
  method: string;
  route: string;
  url: string;
}

export interface RequestContext {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  requestId: string;
  http?: HttpContext;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

export function newRequestId(): string {
  return randomUUID();
}
