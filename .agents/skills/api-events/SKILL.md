---
name: api-events
description: |
  Event-driven side-effect pattern for this ERP — services emit
  `<entity>.<action>` events on `eventBus` after persistence; in-house ERP
  listeners live in `<module>.listeners.ts`, client/3rd-party integrations in
  `src/extensions/`. The audit module listens via a global event-bus tap, so
  every emit whose action is `created|updated|deleted|deactivated` is
  auto-audited — you don't write audit code by hand. Use this skill whenever
  adding a business action that should fire an event, writing or editing any
  `*.listeners.ts` file, putting code under `src/extensions/`, when the user
  asks "where do I put this side-effect" / "should this be a listener or live
  in the service" / "why is the audit log empty for X" / "how do I send a
  WhatsApp on order created", or when migrating a side-effect out of a service
  into a listener. Pair with api-module-scaffold for new modules and
  api-errors when the listener can throw.
---

# API Events — emit + listen

## Event naming

`<entity>.<action>` — singular, snake_case, dot-separated:

```typescript
// api/src/modules/orders/orders.events.ts
export const OrderEvents = {
  CREATED:     'order.created',
  CONFIRMED:   'order.confirmed',
  CANCELLED:   'order.cancelled',
  // ...
} as const;
```

The two-part name matters: the audit tap (see below) only audits events whose
shape is exactly `<entityType>.<action>` and whose action is in the auditable
list (`created`, `updated`, `deleted`, `deactivated`). Single-word events like
`'order_created'` are invisible to audit.

## Emitting

Always emit **after** persistence succeeds, with the saved entity (or a payload
that contains `id` at minimum):

```typescript
import eventBus from '../../common/event-bus';
import { OrderEvents } from './orders.events';

const saved = await orderRepo.save(order);
log.info('Order created', { method: 'create', orderId: saved.id, ... });
eventBus.emit(OrderEvents.CREATED, saved);
return saved;
```

Rules:
- Emit **once** per business action — not once per repo call.
- Pass the entity (or a structured payload) — listeners receive what you emit.
- Don't `await` the listeners (they run synchronously inside `emit` but should
  not be awaitable from the caller).
- If a listener throws, the audit tap still runs (taps fire before listeners
  and are wrapped in try/catch in `event-bus.ts`).

## The two extension points

### 1. Listeners — react to events from another module

Use when **module A's logic depends on something happening in module B**, and
the dependency belongs to A's domain.

Example: `commissions.listeners.ts` reacts to `order.completed` to compute the
seller's commission. Commissions logic doesn't belong inside `orders`, but
commissions cares deeply when an order completes.

File: `src/modules/commissions/commissions.listeners.ts`

```typescript
import eventBus from '../../common/event-bus';
import { OrderEvents } from '../orders/orders.events';
import * as commissionsService from './commissions.service';

export function registerCommissionListeners() {
  eventBus.on(OrderEvents.COMPLETED, (order) => {
    commissionsService.accrueForOrder(order).catch((err) => {
      console.error('[commissions] accrue failed:', err);
    });
  });
}
```

Then register in `src/modules/listeners.ts`:

```typescript
import { registerCommissionListeners } from './commissions/commissions.listeners';

export function registerListeners() {
  // ...
  registerCommissionListeners();
}
```

The central `registerListeners()` is called once from `bootstrap()` in
`src/index.ts`. If your file isn't imported there, your listener never runs.

### 2. Extensions — client-specific or third-party integrations

Use for **anything that is not core ERP behavior**: WhatsApp notifications,
MercadoLibre sync, AFIP / fiscal integrations, custom email flows, etc.

File: `src/extensions/<integration>/`

`src/extensions/index.ts` is the entry point — register extensions here:

```typescript
// src/extensions/index.ts
import { EventEmitter } from 'events';
import { registerWhatsAppListeners } from './whatsapp/whatsapp.listeners';

export function registerExtensions(eventBus: EventEmitter) {
  registerWhatsAppListeners(eventBus);
  // additional client integrations here
}
```

`extensions/` is the right place when:
- The feature is opt-in per client (one client uses WhatsApp, another doesn't).
- The feature talks to an external service (HTTP, SDK, queue).
- Removing it should not affect core flows — listeners catch their own errors.

`modules/<x>/<x>.listeners.ts` is the right place when:
- The feature is part of the ERP domain (commissions, audit, inventory updates).
- It runs for every client.

## The audit tap — why you don't write audit code

`event-bus.ts` exposes `addTap(...)` — a tap fires **before** regular listeners
on **every** `emit`, regardless of event name. The audit module installs a tap
in `audit.listeners.ts` that:

1. Splits the event name on `.` and ignores anything that isn't `entity.action`.
2. Checks `action ∈ ['created', 'updated', 'deleted', 'deactivated']`.
3. Reads the request context (`userId`, `ip`, `requestId`) from AsyncLocalStorage.
4. Writes an audit row with the actor, entity, and a previous/new state diff.

Implications:
- **Don't write `auditService.log(...)` calls in your service.** Emit the
  event correctly and audit happens for free.
- **Use `entity.created` / `entity.updated` / `entity.deleted` action names**
  if you want the change to appear in the audit log. Custom verbs like
  `entity.confirmed` are emitted and dispatched normally but skipped by audit.
  Add them to `AUDITABLE_ACTIONS` in `audit.listeners.ts` if they should be
  audited.
- **Emit AFTER persistence** so the payload reflects the saved row.

## Common patterns

### Service emits → another module reacts

```
orders.service.ts        commissions.listeners.ts
─────────────────        ──────────────────────────
saved = repo.save(o)
emit('order.completed', saved) ─→ on('order.completed', accrueForOrder)
                                     └─ commissions.service.accrueForOrder(o)
                                          └─ repo.save(commission)
                                          └─ emit('commission.created', c)  ─→ audit tap
```

### Service emits → audit tap auto-logs

```
products.service.ts                event-bus tap (audit)
───────────────────                ──────────────────────
emit('product.updated', saved) ─→  audit.log({ actorType: 'user', actorId: ctx.userId, ... })
```

### Listener fails → other listeners + audit still run

The tap loop catches per-tap errors. The native `EventEmitter` does **not**
catch per-listener errors — but in practice every listener wraps its async work
in `.catch(...)` so a failure doesn't crash the request. Mirror the pattern:

```typescript
eventBus.on(OrderEvents.CONFIRMED, (order) => {
  doSomething(order).catch((err) => console.error('[my-listener] failed:', err));
});
```

## What NOT to do

```typescript
// ❌ Skipping the event
const saved = await repo.save(order);
return saved;   // listeners never fire, audit has no row

// ❌ Emitting before persistence
eventBus.emit(OrderEvents.CREATED, order);   // payload has no id, listeners blow up
const saved = await repo.save(order);

// ❌ Side-effect inside the service that should be a listener
await sendWhatsAppNotification(saved);   // belongs in extensions/whatsapp

// ❌ Writing audit code by hand
await auditService.log({ action: 'order.created', ... });   // the tap already does this

// ❌ Awaiting the emit
await eventBus.emit(OrderEvents.CREATED, saved);   // emit returns boolean, not Promise

// ❌ Subscribing to '*' or to the whole bus
eventBus.on('*', handler);   // EventEmitter doesn't support this — use addTap

// ❌ Listener file that nobody imports
// src/modules/promotions/promotions.listeners.ts exists but listeners.ts
// doesn't import registerPromotionsListeners → listener never registers
```

## Checklist per new event

- [ ] Constant added to `<module>.events.ts`, exported from a `*Events` object
- [ ] Name shape is `<entity>.<action>` (lowercase, dot-separated)
- [ ] If you want audit on it: action ∈ `created|updated|deleted|deactivated`
      OR add the action to `AUDITABLE_ACTIONS` in `audit.listeners.ts`
- [ ] `eventBus.emit(...)` is called AFTER `repo.save(...)`
- [ ] Payload includes the entity `id` (and any fields downstream listeners need)

## Checklist per new listener

- [ ] Lives in `src/modules/<consumer>/<consumer>.listeners.ts` for ERP logic
      OR in `src/extensions/<integration>/` for client/3rd-party integrations
- [ ] Exports a `registerXxxListeners()` function
- [ ] Async work inside the handler has its own `.catch(...)` — no bare promises
- [ ] Imported and called from `src/modules/listeners.ts` (for modules) or
      `src/extensions/index.ts` (for extensions)
- [ ] Doesn't mutate the payload object — treat it as read-only
