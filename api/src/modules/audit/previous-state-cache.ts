// Short-lived snapshot of entities about to be updated/deleted, keyed by
// `${entityType}:${entityId}`. The audit listener consumes (reads + deletes)
// the snapshot when a matching `*.updated` / `*.deleted` event fires.
//
// The TTL exists as a safety valve — if a service updates an entity without
// ever emitting an event, the snapshot would leak. 60s is long enough for any
// reasonable request cycle and short enough to avoid memory pressure.

type Snapshot = { value: Record<string, any>; expiresAt: number };

const TTL_MS = 60_000;
const cache = new Map<string, Snapshot>();

function key(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function pruneExpired() {
  const now = Date.now();
  for (const [k, snap] of cache) {
    if (snap.expiresAt <= now) cache.delete(k);
  }
}

export function recordPreviousSnapshot(
  entityType: string,
  entityId: string,
  value: Record<string, any>,
) {
  if (!entityType || !entityId) return;
  if (cache.size > 1000) pruneExpired();
  cache.set(key(entityType, entityId), {
    value,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function consumePreviousSnapshot(
  entityType: string,
  entityId: string,
): Record<string, any> | null {
  const k = key(entityType, entityId);
  const snap = cache.get(k);
  if (!snap) return null;
  cache.delete(k);
  if (snap.expiresAt <= Date.now()) return null;
  return snap.value;
}
