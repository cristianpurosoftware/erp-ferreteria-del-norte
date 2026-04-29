import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/data-source';

export type TxFn<T> = (em: EntityManager) => Promise<T>;

/**
 * Wraps a unit of work in a single DB transaction.
 *
 * Use it whenever a service writes to more than one table or needs a consistent
 * read-then-write under concurrency. The callback receives an EntityManager —
 * always use `em.getRepository(Entity)` inside the callback (not the global
 * `AppDataSource.getRepository(...)`) so every operation joins the same tx.
 *
 * Side-effects that must NOT roll back with the transaction (eventBus.emit,
 * external HTTP, queue enqueue) belong AFTER `withTransaction` resolves.
 */
export function withTransaction<T>(fn: TxFn<T>): Promise<T> {
  return AppDataSource.manager.transaction(fn);
}
