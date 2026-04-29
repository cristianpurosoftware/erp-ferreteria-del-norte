import {
  EventSubscriber,
  EntitySubscriberInterface,
  RemoveEvent,
  LoadEvent,
} from 'typeorm';
import { recordPreviousSnapshot } from './previous-state-cache';

// Converts 'OrderEntity' -> 'order', 'PriceListEntity' -> 'price_list',
// 'SupplierDeliveryNoteEntity' -> 'supplier_delivery_note'.
function entityClassToSnake(targetName: string): string {
  const stripped = targetName.replace(/Entity$/, '');
  return stripped
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function extractTargetName(target: any): string | null {
  if (!target) return null;
  if (typeof target === 'function') return target.name || null;
  if (typeof target === 'string') return target;
  return null;
}

function cloneSnapshot(entity: any): Record<string, any> | null {
  if (!entity) return null;
  try {
    return JSON.parse(JSON.stringify(entity));
  } catch {
    return null;
  }
}

function storeSnapshot(entityClassName: string | null, entity: any) {
  if (!entityClassName || !entity?.id) return;
  const snapshot = cloneSnapshot(entity);
  if (!snapshot) return;

  // Store under both snake_case and kebab-case so the listener can look up
  // regardless of which convention the event name uses
  // (e.g. `order.updated` vs `price-list.updated`).
  const snake = entityClassToSnake(entityClassName);
  const kebab = snake.replace(/_/g, '-');

  recordPreviousSnapshot(snake, entity.id, snapshot);
  if (kebab !== snake) recordPreviousSnapshot(kebab, entity.id, snapshot);
}

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  // afterLoad is the most reliable capture point: every repo.findOne / find
  // triggers it with the fully-materialized DB state. Capturing here means
  // that when a subsequent service method mutates and saves the entity, the
  // pre-mutation snapshot is already in the cache.
  afterLoad(entity: any, event?: LoadEvent<any>) {
    if (!entity?.id || !event?.metadata?.target) return;
    const className = extractTargetName(event.metadata.target);
    storeSnapshot(className, entity);
  }

  beforeRemove(event: RemoveEvent<any>) {
    const entity = event.databaseEntity || event.entity;
    if (!entity) return;
    const className = extractTargetName(event.metadata?.target);
    storeSnapshot(className, entity);
  }
}
