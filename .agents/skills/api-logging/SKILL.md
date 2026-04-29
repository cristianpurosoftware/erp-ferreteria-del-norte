---
name: api-logging
description: |
  Structured logging pattern for this ERP — `logger` from `common/logger`,
  module-scope child via `log = logger.child({ context: { layer: 'service',
  module: '<name>' } })`, `requestId / userId / ip / clientSlug / http.*`
  auto-injected from AsyncLocalStorage on every call. Logging lives in services
  (never controllers); log AFTER persistence with the entity id and key
  business fields; skip list/read endpoints. Use this skill whenever adding any
  new service function that creates / updates / transitions / deletes, when
  reviewing a service file with no logs, when an agent is about to write
  `console.log` / `console.error` / `logger.info({ obj }, 'msg')` (the legacy
  obj-first form), when migrating away from console.* or unstructured logging,
  when the user asks "where do I put this log?" / "why isn't my log appearing
  in Axiom?" / "why is requestId missing?" / "how do I query this in Axiom?",
  or when adding a new `clientSlug` filter to a query. Pair with api-controller
  (controllers never log), api-events (audit auto-logs via the event-bus tap),
  and api-errors (the global error-handler logs unknown errors once, with
  request context).
---

# API Logging — ERP pattern

## Core rule

**Log in services, never in controllers.** Controllers are thin pass-throughs.
Log after the operation succeeds (so you have the real ID and outcome).

## Import

```typescript
import { logger } from '../../common/logger';
```

That's it. Use `logger` directly inside any function — request context
(`requestId`, `userId`, `ip`) is injected automatically by the pino `mixin()`
that reads AsyncLocalStorage on every log call.

## Signature — message first

```typescript
logger.info('Order created');                                       // string only
logger.info('Order created', { orderId, customerId, total });       // string + payload
logger.info({ orderId });                                           // payload only (rare)
```

Preferred form is **message first, payload second**. The wrapper also accepts
the pino-native order (`obj, msg`) for compatibility, but new code should put
the message first for readability.

## Auto-injected request fields

The `requestContext` middleware (`api/src/middlewares/request-context.middleware.ts`)
runs `runWithContext()` and the global pino `mixin()` reads it on every log
call. **You never write these fields — they show up automatically:**

| Field | Source | Notes |
|---|---|---|
| `requestId` | inbound `X-Trace-Id` header, else generated UUID | Mirrored back as `X-Trace-Id` response header so callers can correlate |
| `userId` | `req.user.id` (set by `verifyToken`) | Omitted if no auth |
| `ip` | `req.ip` (Express, after `trust proxy`) | |
| `http.method` | `req.method` | `GET`, `POST`, ... |
| `http.route` | `req.route?.path ?? req.path` | At middleware time route isn't matched yet, so it falls back to the concrete URL path |
| `http.url` | `req.originalUrl` | Includes query string |
| `clientSlug` | `CLIENT_SLUG` env | **Multi-tenant filter key** — every client deploys with their own `CLIENT_SLUG`. The Axiom dataset is shared across all clients, so this is the field you scope by: `clientSlug == "acme-erp"` |
| `clientName`, `appEnv`, `flyApp`, `gitSha` | env / build | Stamped on every log via pino `base` |

In Axiom: `http.method == "POST" and http.url =~ "/orders"` to scope a query
to a specific endpoint, or `requestId == "..."` for a full request trace.

For cross-service tracing, callers can pass `X-Trace-Id` and we'll honor it.

## The `context` field — where in the app

Every meaningful log should carry a `context` object that says **where in the
codebase** it came from. Three independent axes for filtering in Axiom:

```typescript
logger.info('user authenticated', {
  context: {
    layer: 'service',         // controller | service | repository | middleware | listener
    module: 'users',          // business domain
    method: 'authenticate',   // function name
  },
  userId: user.id,
});
```

In Axiom: `context.layer == "repository"` shows every DB-touching log.
`context.module == "orders"` shows everything from the orders domain.

### Per-file child logger

To avoid retyping `layer` and `module` on every line, create a **module-scope
child logger** at the top of the file. The request context (`requestId`,
`userId`, `ip`) still flows in via the global `mixin()`, so this only adds the
location bindings.

```typescript
// src/modules/orders/orders.service.ts
import { logger } from '../../common/logger';

const log = logger.child({ context: { layer: 'service', module: 'orders' } });

export async function create(body: CreateOrderBody) {
  const order = await orderRepo().save(...);
  log.info('Order created', { method: 'create', orderId: order.id });
  return order;
}

export async function cancel(id: string) {
  await orderRepo().softDelete(id);
  log.info('Order cancelled', { method: 'cancel', orderId: id });
}
```

The output carries `context.layer`, `context.module`, **and** `context.method`
(merged from the call site) — three filterable axes plus the per-request fields.

## When to log

| Operation | Log? | Level |
|---|---|---|
| Create (POST) | ✅ always | `info` |
| State transition (PATCH status) | ✅ always | `info` |
| Hard delete | ✅ always | `info` |
| Soft delete | ✅ always | `info` |
| Update non-status fields (PUT/PATCH) | ✅ if meaningful | `info` |
| List / paginated read (GET many) | ❌ skip | — |
| Single read by id (GET one) | ❌ skip | — |

**Why skip reads?** High volume, low signal. Axiom costs scale with events.
Only log reads if they involve expensive side-effects or access to sensitive data.

## Log levels

| Situation | Level |
|---|---|
| Operation completed successfully | `info` |
| Expected business rejection (BusinessLogicError thrown) | `warn` |
| Unexpected error (caught in error-handler) | `error` |

## Required fields per operation

Every log call must include:
- `msg` — human-readable, past tense: `"Order created"`, `"Customer deleted"`
- entity id field named after the entity: `orderId`, `customerId`, `productId`, etc.
- `action` — snake_case verb: `create`, `update`, `delete`, `transition`

For state transitions, also include:
- `from` — previous status
- `to` — new status

For creates, include the most relevant scalar business fields (avoid nesting objects).

## Examples

### Create
```typescript
export async function createOrder(body: CreateOrderBody, userId: string) {
  const order = await withTransaction(async (manager) => {
    // ... business logic ...
    return manager.save(newOrder);
  });
  logger.info('Order created', { action: 'create', orderId: order.id, customerId: order.customerId, total: order.total });
  return order;
}
```

### State transition
```typescript
export async function updateOrderStatus(id: string, newStatus: string) {
  const order = await orderRepo().findOneByOrFail({ id });
  const from = order.status;
  assertTransition(TRANSITIONS, from, newStatus, 'order');
  order.status = newStatus;
  const saved = await orderRepo().save(order);
  logger.info('Order status updated', { action: 'transition', orderId: id, from, to: newStatus });
  return saved;
}
```

### Soft delete
```typescript
export async function deleteCustomer(id: string) {
  const customer = await customerRepo().findOneByOrFail({ id });
  await customerRepo().softDelete(id);
  logger.info('Customer deleted', { action: 'delete', customerId: id });
}
```

### Update
```typescript
export async function updateProduct(id: string, body: UpdateProductBody) {
  const product = await productRepo().findOneByOrFail({ id });
  Object.assign(product, body);
  const saved = await productRepo().save(product);
  logger.info('Product updated', { action: 'update', productId: id });
  return saved;
}
```

## Worked example — adding logs to a `POST /orders` endpoint

This walks through every decision involved in instrumenting one real endpoint,
end-to-end. Use it as the template when adding logs to any new module.

### 1. The shape of the endpoint

```
POST /api/orders                               (router)
  └─ verifyToken + requestContext              (middleware — auto-injects requestId, userId, ip, http)
  └─ requirePermission('orders:create')        (middleware — 403 here is logged by error-handler)
  └─ validateBody(CreateOrderSchema)           (middleware — 422 here is logged by error-handler)
  └─ controller.create(req, res)               (NO logs here — pass-through only)
  └─ service.create(body, permissions)         (← all logs live here)
```

Rule: the **service** owns logging. The controller stays a one-liner. Anything
thrown (NotFound, Forbidden, validation) bubbles up and the global
`error-handler` middleware logs it once.

### 2. Module-scope child logger

Top of `api/src/modules/orders/orders.service.ts`:

```typescript
import { logger } from '../../common/logger';

const log = logger.child({ context: { layer: 'service', module: 'orders' } });
```

Now every `log.*` call from this file carries `context.layer = "service"` and
`context.module = "orders"` automatically.

### 3. What to log inside `create()`

The order-create flow has several decision points. Here's the call graph and
what gets a log:

```
service.create(data, permissions)
  ├─ findCustomer(data.customerId)
  │    └─ NotFoundError                     ← do NOT log here. error-handler logs as error.
  ├─ resolvePriceForItem(...)               ← per-item; no logs (would be N logs per request)
  │    └─ price override detected
  │         └─ ForbiddenError                ← do NOT log; error-handler logs as warn (BusinessLogicError)
  ├─ orderRepo().save(order)                ← persistence
  ├─ if priceOverrides.length > 0           ← notable business event
  │    └─ log.warn('Price overrides applied to order', { ...overrides })
  ├─ log.info('Order created', { ...key fields })   ← always, after success
  └─ eventBus.emit(OrderEvents.CREATED)     ← listeners log themselves if interesting
```

### 4. The actual logs

```typescript
export async function create(data: CreateOrderBody, userPermissions: string[] = []) {
  // ... customer lookup, price resolution, build entity ...

  const saved = await orderRepo().save(order);

  // Business event worth flagging — operators want to see when prices were
  // overridden so they can audit behavior of users with that permission.
  if (priceOverrides.length > 0) {
    log.warn('Price overrides applied to order', {
      method: 'create',
      orderId: saved.id,
      customerId: saved.customerId,
      overrideCount: priceOverrides.length,
      overrides: priceOverrides,
    });
  }

  // The canonical "created" log. Always fires after success.
  log.info('Order created', {
    method: 'create',
    orderId: saved.id,
    customerId: saved.customerId,
    itemCount: saved.items.length,
    total: saved.total,
    status: saved.status,
  });

  eventBus.emit(OrderEvents.CREATED, { ...saved, priceOverrides: ... });
  return saved;
}
```

### 5. What ends up in Axiom

For one successful `POST /api/orders` request with one price override, two
events are sent:

```jsonc
// 1. The override warning
{
  "level": 40,                                       // warn
  "msg": "Price overrides applied to order",
  "method": "create",
  "orderId": "ord_a3f2",
  "customerId": "cus_b71c",
  "overrideCount": 1,
  "overrides": [{ "productId": "p_99", "listPrice": 100, "actualPrice": 90, "delta": -10 }],

  "context":  { "layer": "service", "module": "orders", "method": "create" },
  "http":     { "method": "POST", "route": "/orders", "url": "/api/orders" },
  "requestId": "...", "userId": "u_...", "ip": "1.2.3.4",
  "clientSlug": "acme-erp", "appEnv": "production"
}

// 2. The created log
{
  "level": 30,                                       // info
  "msg": "Order created",
  "method": "create",
  "orderId": "ord_a3f2",
  "customerId": "cus_b71c",
  "itemCount": 3,
  "total": 4250.00,
  "status": "draft",

  "context":  { "layer": "service", "module": "orders", "method": "create" },
  "http":     { "method": "POST", "route": "/orders", "url": "/api/orders" },
  "requestId": "...", "userId": "u_...", "ip": "1.2.3.4",
  "clientSlug": "acme-erp", "appEnv": "production"
}
```

### 6. Useful Axiom queries against this data

```apl
// every order created today by a specific seller
clientSlug == "acme-erp"
  and context.module == "orders"
  and msg == "Order created"
  and userId == "u_seller_42"

// price-override audit (last 7 days)
clientSlug == "acme-erp" and msg == "Price overrides applied to order"
  | summarize overrideCount = sum(overrideCount) by userId

// full trace of one request that misbehaved
requestId == "a3f2..."
  | order by _time asc
```

### 7. Generalizing

For any new endpoint, ask in this order:

1. **Did persistence succeed?** → one `log.info('<Entity> <pastTenseAction>', { method, <entityId>, ...keyFields })` after the save.
2. **Did the request transition state?** → include `from` + `to` in the payload.
3. **Did anything notable but non-fatal happen mid-flow?** (price override, retry, fallback used, partial result) → `log.warn` with the relevant detail. Don't log "happy path" sub-steps.
4. **Did something throw?** → don't log it here. The error-handler logs every uncaught error once with the request context attached.
5. **Is this a list/read?** → no log.

## What NOT to do

```typescript
// ❌ Logging in controller
export async function createOrderHandler(req, res) {
  logger.info('creating order');   // wrong place
  const order = await ordersService.create(req.body);
  return successResponse(res, order);
}

// ❌ Logging before the operation
logger.info({ body }, 'About to create order');  // noise, no id yet
const order = await save(newOrder);

// ❌ Logging reads
export async function getOrder(id: string) {
  const order = await orderRepo().findOneByOrFail({ id });
  logger.info({ orderId: id }, 'Order fetched');   // too noisy
  return order;
}

// ❌ console.log / console.error anywhere
console.log('order created', order.id);

// ❌ Re-introducing a getLogger() helper or a module-scope alias
const myLogger = logger.child({ scope: 'orders' });   // unnecessary; just use logger
```

## Checklist per service file

- [ ] Import `logger` from `../../common/logger` (named import)
- [ ] Module-scope child: `const log = logger.child({ context: { layer: 'service', module: '<domain>' } })`
- [ ] Use `log` (not `logger`) inside functions; include `method: '<fnName>'` in the payload
- [ ] Message first, payload second
- [ ] Log after every `create` with entity id + key business fields
- [ ] Log after every `delete` / `softDelete`
- [ ] Log after every status/state `transition` with `from` + `to`
- [ ] Log after meaningful `update` operations
- [ ] No logs on list/read operations
- [ ] No logs in the corresponding controller
- [ ] No `console.log` / `console.error` remaining
