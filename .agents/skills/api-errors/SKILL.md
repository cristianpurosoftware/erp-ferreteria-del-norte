---
name: api-errors
description: |
  Error-throwing pattern for this ERP — pick the right class from
  `api/src/common/errors.ts` (`NotFoundError`, `ForbiddenError`,
  `ValidationError`, `BusinessLogicError`, `UnauthorizedError`); the global
  `error-handler` middleware renders the standard envelope; never call
  `res.status(...)` from a controller or service. Use this skill whenever
  throwing from any service, choosing between `ValidationError` (400) and
  `BusinessLogicError` (422) or between a router `requirePermission` guard and
  a `ForbiddenError` (403), when the user asks "why does the client see 500
  instead of 422?" / "is this a 403 or a 422?" / "where does this code come
  from?", reviewing a `try/catch` that swallows an error, adding a new error
  code for a `BusinessLogicError`, or returning `null` from a service to
  signal "not found" (you should be throwing instead). Pair with
  api-controller (controllers must let errors bubble) and api-events
  (listeners catch their own errors).
---

# API Errors — throw, don't return

## Decision table

| Situation | Throw | HTTP | Response code |
|---|---|---|---|
| Zod schema fails on `req.body` / `req.query` / `req.params` | (handled by middleware) | 400 | `VALIDATION_ERROR` |
| Caller is unauthenticated (no/expired JWT) | `UnauthorizedError` | 401 | `REQUEST_ERROR` |
| Caller has no permission (binary gate) | (handled by `requirePermission`) | 403 | `REQUEST_ERROR` |
| Caller has the right route permission but lacks a conditional capability (price override, big amount, …) | `ForbiddenError` | 403 | `REQUEST_ERROR` |
| Entity doesn't exist (`findOne` returned null) | `NotFoundError` | 404 | `REQUEST_ERROR` |
| Input shape was valid but a business invariant is broken (state transition not allowed, credit limit exceeded, stock insufficient) | `BusinessLogicError(code, msg, detail?)` | 422 | `<code>` (e.g. `CREDIT_BLOCK`) |
| Something the caller can fix by changing input — but Zod can't catch it (e.g. "this email already exists" after a unique-constraint hit) | `ValidationError` | 400 | `REQUEST_ERROR` |
| TypeORM query exploded (FK violation, unique violation surfacing past the service) | (auto-mapped by error-handler) | 400 | `DATABASE_ERROR` |
| Anything else (genuine bug) | throw native `Error` | 500 | `INTERNAL_ERROR` |

The rule of thumb between the two ambiguous pairs:

- **`ValidationError` (400) vs `BusinessLogicError` (422)**: 400 means *the
  shape of your request is wrong* (missing field, wrong type, invalid format).
  422 means *the request shape is fine, but the business says no* (you can't
  cancel an already-completed order; this customer is over their credit limit).
  When in doubt, prefer 422 — it's the clearer signal to the client.
- **`requirePermission` middleware vs `ForbiddenError`**: middleware for binary
  "you have or don't have this permission". `ForbiddenError` for decisions that
  depend on request data ("you have `orders:create` but this specific order
  uses an overridden price, which needs `orders:override_price`").

## The error classes

```typescript
// api/src/common/errors.ts
export class RouteError extends Error { status: number; ... }
export class UnauthorizedError extends RouteError { /* 401 */ }
export class ForbiddenError    extends RouteError { /* 403 */ }
export class NotFoundError     extends RouteError { /* 404 */ }
export class ValidationError   extends RouteError { /* 400 */ }
export class BusinessLogicError extends RouteError {
  /* 422, plus a `code` and optional `detail` payload */
  constructor(code: string, message: string, detail?: Record<string, unknown>);
}
```

Always import from `common/errors`:

```typescript
import { NotFoundError, BusinessLogicError, ForbiddenError } from '../../common/errors';
```

## Examples

### NotFoundError — every `findById`

```typescript
export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Promoción no encontrada');
  return item;
}
```

Use Spanish messages (the user-facing layer is in Spanish — see
`server-side-table` for the broader rule).

### BusinessLogicError — invariant violation

```typescript
if (order.status !== 'draft') {
  throw new BusinessLogicError(
    'INVALID_OPERATION',
    'El pedido solo puede modificarse en estado borrador',
  );
}
```

Always pass a stable machine-readable `code` first. Clients (frontend,
integrations) switch on the code — `INVALID_OPERATION`, `CREDIT_BLOCK`,
`STOCK_INSUFFICIENT`, `PRICE_NOT_RESOLVED`, `STATE_TRANSITION_INVALID`. The
message is for humans.

Optional third arg is structured detail that surfaces in the response under
`error.detail`:

```typescript
throw new BusinessLogicError('CREDIT_BLOCK', 'Sin crédito disponible', {
  currentBalance: 12000,
  creditLimit: 10000,
  reason: 'over_limit',
});
```

Renders as:

```json
{
  "success": false,
  "error": {
    "code": "CREDIT_BLOCK",
    "message": "Sin crédito disponible",
    "detail": { "currentBalance": 12000, "creditLimit": 10000, "reason": "over_limit" }
  }
}
```

### ForbiddenError — conditional capability

```typescript
const canOverride = userPermissions.includes('orders:override_price');
if (priceWasOverridden && !canOverride) {
  throw new ForbiddenError(
    `Price override requires orders:override_price`,
  );
}
```

### ValidationError — shape valid but content rejected post-hoc

```typescript
const existing = await repo.findOne({ where: { email: data.email } });
if (existing) {
  throw new ValidationError('Ya existe un usuario con ese email');
}
```

Prefer adding a Zod refinement (`.refine(async ...)`) when feasible. Use
`ValidationError` when the check requires a DB lookup or complex async logic
that's awkward to express in a schema.

## State transitions — assertTransition wraps it

`api/src/common/state-machine.ts` exposes `assertTransition()` which throws
`BusinessLogicError('STATE_TRANSITION_INVALID', ...)` automatically. Don't
re-throw it manually:

```typescript
import { assertTransition, TransitionMap } from '../../common/state-machine';

const TRANSITIONS: TransitionMap<string> = {
  draft: ['pending_confirmation', 'cancelled'],
  pending_confirmation: ['confirmed', 'rejected'],
  // ...
};

assertTransition(TRANSITIONS, order.status, newStatus, 'order');
```

## How errors reach the client

The chain is fixed and there's nothing to wire per module:

1. Service throws (or middleware throws — `validateBody` throws `ZodError`,
   `requirePermission` throws `ForbiddenError`).
2. Express bubbles it to `errorHandler` middleware
   (`api/src/middlewares/error-handler.ts`).
3. `errorHandler` matches the class and renders the standard envelope.
4. For unknown errors, it logs `{ err, stack }` at `error` level and returns
   500 with a generic message in production (full message in dev).

You don't need to do anything in the controller. The handler is registered
last in `src/index.ts` after all routers.

## Logging vs throwing

- **Throw** when the request must fail. The error handler logs unknown errors
  automatically; for known `RouteError` subclasses it does not log (the failure
  is the client's problem, not a server bug).
- **Log + throw** when the failure is interesting (`log.warn(...)` then throw).
  Example: `log.warn('Price override applied but caller lacks permission', { ... })`
  immediately before `throw new ForbiddenError(...)`. The warn captures the
  attempt for security audit; the throw rejects the request.
- **Log only** (no throw) for non-fatal anomalies the request can recover from.

## What NOT to do

```typescript
// ❌ try/catch that swallows the error
try {
  return await repo.save(order);
} catch (e) {
  return null;          // controller renders { data: null }, client thinks it worked
}

// ❌ try/catch that re-throws as a generic Error
try {
  return await stuff();
} catch (e) {
  throw new Error('something went wrong');   // 500 instead of the real status
}

// ❌ res.status(...) inside a service — services don't see `res`
res.status(404).json({ ... });

// ❌ Returning a falsy value to signal "not found"
const order = await repo.findOne({ where: { id } });
if (!order) return null;   // controllers will render `data: null` as success

// ❌ Hardcoded status string instead of a typed error
throw new Error('NOT_FOUND');                 // becomes 500
throw { status: 404, message: 'not found' };  // not an Error → unhandled

// ❌ Leaking driver errors
catch (e) { throw new BusinessLogicError('DB', e.message); }
// — let QueryFailedError reach the handler; it maps to 400 / DATABASE_ERROR
//   and hides driver detail in production.

// ❌ Using BusinessLogicError without a stable code
throw new BusinessLogicError('', 'Algo falló');
// — the code is the API contract. Don't ship empty.
```

## Checklist when throwing

- [ ] Throwing one of the classes from `common/errors.ts` (or `assertTransition`)
- [ ] No `try/catch` in the controller; service-level catches only when there's
      a meaningful recovery path
- [ ] Message is user-facing, in Spanish
- [ ] `BusinessLogicError` always has a stable, snake-or-screaming-snake code
- [ ] Conditional capability check throws `ForbiddenError`, not `Error`
- [ ] No `res.status(...)` anywhere outside `common/response.ts` and the error
      handler
- [ ] Nothing returns `null` to signal "not found" — throw `NotFoundError`
