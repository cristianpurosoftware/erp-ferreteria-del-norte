import eventBus from '../../common/event-bus';
import { getContext } from '../../common/request-context';
import { auditService } from './audit.service';
import { consumePreviousSnapshot } from './previous-state-cache';
import { registerBuiltInLabelResolvers } from './audit-label-registry';

const AUDITABLE_ACTIONS = ['created', 'updated', 'deleted', 'deactivated'];

/**
 * Registers an event-bus tap that writes an audit row for every two-part
 * event matching `<entityType>.<auditableAction>` (e.g. `order.updated`).
 * Taps fire deterministically on every emit, so there is no dependency on
 * the order in which modules import eventBus.
 */
export function registerAuditListeners() {
  registerBuiltInLabelResolvers();

  eventBus.addTap((name, payload) => {
    const parts = name.split('.');
    if (parts.length !== 2) return;
    const [entityType, action] = parts;
    if (!AUDITABLE_ACTIONS.includes(action)) return;

    const p = payload || {};
    const entityId = p.id || 'unknown';
    const ctx = getContext();

    const actorType = ctx?.userId ? 'user' : 'system';
    const actorId = ctx?.userId;
    const ipAddress = ctx?.ipAddress;
    const requestId = ctx?.requestId;

    let previousState: any = null;
    if (action === 'updated' || action === 'deleted' || action === 'deactivated') {
      previousState = consumePreviousSnapshot(entityType, entityId) ?? null;
    }
    const newState = action === 'deleted' ? null : p;

    auditService
      .log({
        actorType,
        actorId,
        action: name,
        entityType,
        entityId,
        previousState,
        newState,
        ipAddress,
        metadata: requestId ? { requestId } : undefined,
      })
      .catch((err) => {
        console.error(`[audit] Failed to log event ${name}:`, err.message);
      });
  });
}
