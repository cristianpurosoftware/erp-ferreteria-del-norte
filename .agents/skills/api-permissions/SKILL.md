---
name: api-permissions
description: |
  RBAC pattern for this ERP — single source of truth in
  `api/src/modules/permissions/permissions.constants.ts`, routes guard via
  `requirePermission(PERMISSIONS.X.Y)`, the frontend mirrors with
  `usePermissions().can(...)`. Use this skill whenever adding any new endpoint
  (every route, including reads, declares a permission), adding a new module,
  choosing between a router-level guard and a `ForbiddenError` thrown from a
  service, migrating a hardcoded `'foo:bar'` permission string, seeding
  permissions on existing roles, or when the user asks "what permission should
  X require?" / "is this protected?" / "why is the user getting 403?". Pair with
  api-errors when the gate is conditional inside a service, and with
  api-module-scaffold when wiring a brand-new resource.
---

# API Permissions — RBAC pattern

## Source of truth

`api/src/modules/permissions/permissions.constants.ts` is the only place where
permission strings live. Everything else (router guards, JWT payload, frontend
checks, role seeds) reads from this file or from the JWT.

```typescript
export const PERMISSIONS = {
  ORDERS: {
    VIEW:           'orders:view',
    CREATE:         'orders:create',
    UPDATE:         'orders:update',
    CONFIRM:        'orders:confirm',
    OVERRIDE_PRICE: 'orders:override_price',
  },
  // ...
};
```

Permission strings are `recurso:acción`, snake_case for the resource part when
the resource has multiple words (`price_lists:view`, `supplier_invoices:approve`).

## Adding a new permission

### 1. Declare it in the constants file

Add to the existing block if the resource exists, or add a new block at the
correct alphabetical position:

```typescript
ORDERS: {
  VIEW:           'orders:view',
  // ... existing ...
  EXPORT:         'orders:export',     // ← new
},
```

### 2. Use it in the router

Never write the literal string in the router — always reference through the
constants object. TypeScript will catch typos at compile time:

```typescript
import { PERMISSIONS } from '../permissions/permissions.constants';

router.get('/export', requirePermission(PERMISSIONS.ORDERS.EXPORT), controller.export);
```

### 3. Seed it on existing roles (optional)

If the new permission should be auto-granted to an existing role (e.g. all
admins get `orders:export`), update the role seeds under `src/seeds/`. Otherwise
operators assign it via the UI.

### 4. Mirror on the frontend

The session JWT carries the user's permissions. The frontend gates UI actions
with `usePermissions().can('orders:export')`. Use the **same string** as the
backend — copy from `permissions.constants.ts`. Don't introduce a separate
frontend constant.

## Guarding routes

Every route — including read endpoints — declares its required permission.
There's no implicit "logged in is enough":

```typescript
import { requirePermission } from '../../middlewares/permissions';
import { PERMISSIONS } from '../permissions/permissions.constants';

router.get('/',          requirePermission(PERMISSIONS.PROMOTIONS.VIEW),     controller.getAll);
router.get('/summary',   requirePermission(PERMISSIONS.PROMOTIONS.VIEW),     controller.getSummary);
router.get('/:id',       requirePermission(PERMISSIONS.PROMOTIONS.VIEW),     controller.getById);
router.post('/',         requirePermission(PERMISSIONS.PROMOTIONS.CREATE),   controller.create);
router.put('/:id',       requirePermission(PERMISSIONS.PROMOTIONS.UPDATE),   controller.update);
router.delete('/:id',    requirePermission(PERMISSIONS.PROMOTIONS.DELETE),   controller.remove);
router.post('/:id/activate',
  requirePermission(PERMISSIONS.PROMOTIONS.ACTIVATE), controller.activate);
```

`/summary` reuses `:VIEW` — same data exposure, same gate.

## Per-action conditional permissions inside a service

When a single endpoint exposes a *capability* that only some users can use
(e.g. `POST /orders` lets sellers create orders, but only sellers with
`orders:override_price` can submit a price that differs from the list), the
controller forwards `req.user.permissions` and the service decides:

```typescript
// orders.controller.ts
const userPermissions: string[] = (req as any).user?.permissions ?? [];
const item = await service.create(req.body, userPermissions);

// orders.service.ts
const canOverride = userPermissions.includes(PERMISSIONS.ORDERS.OVERRIDE_PRICE);
if (resolution.overridden && !canOverride) {
  throw new ForbiddenError('Price override requires orders:override_price');
}
```

For binary "you have it / you don't" gates, the router-level
`requirePermission` is enough. Push to the service only when the decision
depends on request data (price, amount, target entity, ...).

## Naming convention

| Pattern | Example | When |
|---|---|---|
| `<resource>:view` | `orders:view` | Read access (list + detail + summary) |
| `<resource>:create` | `orders:create` | Insert |
| `<resource>:update` | `orders:update` | Edit non-status fields |
| `<resource>:delete` | `orders:delete` | Soft/hard delete |
| `<resource>:<verb>` | `orders:confirm` | Workflow transition |
| `<resource>:<verb_with_underscore>` | `cashbox:close_with_diff` | Compound verb, snake_case |
| `<resource>:<feature>` | `orders:override_price` | Capability flag inside an existing action |

Resources with multiple words → snake_case: `price_lists:view`,
`supplier_invoices:approve`, `withholding_padrones:lookup`. **Never** kebab-case
or camelCase in the permission string.

## What NOT to do

```typescript
// ❌ Hardcoded string in the router
router.post('/', requirePermission('orders:create'), controller.create);

// ❌ New frontend constant that mirrors but drifts
export const FRONTEND_PERMISSIONS = { CREATE_ORDER: 'orders:create' };

// ❌ Skipping the gate "because the route is obvious"
router.get('/orders', controller.getAll);

// ❌ Granting every action to anyone with `:view`
//    (each verb gets its own permission, so it can be revoked independently)

// ❌ Renaming an existing permission silently
//    Removing `orders:create` breaks every role that had it. Either add a
//    new permission and migrate roles in a seed, or keep the old name.

// ❌ Throwing 403 from the controller
//    Use `requirePermission` middleware (binary) or throw `ForbiddenError`
//    from the service (conditional). Never write `res.status(403)` by hand.
```

## Checklist when adding a new permission

- [ ] String declared in `permissions.constants.ts` under the correct resource block
- [ ] Resource part snake_case, action part snake_case, joined by `:`
- [ ] Used in the router via `PERMISSIONS.X.Y` (no literal strings)
- [ ] If conditional inside a service: throw `ForbiddenError` (see `api-errors`)
- [ ] Frontend `usePermissions().can(...)` calls use the exact same string
- [ ] Seed updated if the permission must auto-attach to an existing role
- [ ] No new permission left unused — if the router doesn't reference it, delete it
