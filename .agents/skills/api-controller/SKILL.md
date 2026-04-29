---
name: api-controller
description: |
  How controllers in this ERP wire HTTP to services — they are thin pass-throughs
  that parse `req`, call exactly one service function, and return through a helper
  from `common/response.ts`. Use this skill whenever editing or creating any file
  ending in `.controller.ts`, reviewing a PR that touches one, when an agent is
  about to add `try/catch`, `logger.*`, `console.*`, or `AppDataSource.*` inside a
  controller, when the user asks "where does this logic go?" / "controller or
  service?" / "why did the response shape change?", or when migrating a fat
  controller to the thin pattern. Pair with api-errors (controllers must let errors
  bubble) and api-logging (controllers never log).
---

# API Controller pattern

## Core rule

A controller method is **3–5 lines**. It does only:

1. Pull inputs from `req` (params, query, body, `req.user`).
2. Call exactly one service function.
3. Pass the result to a response helper from `common/response.ts`.

Anything else (validation, branching, calculation, DB calls, logging, error
handling, transactions) belongs in the service.

```typescript
// ✅ Good — boring on purpose
export async function getById(req: Request, res: Response) {
  const item = await service.findById(req.params.id);
  return successResponse(res, item);
}
```

## Why thin

- **Logging lives in services** (see `api-logging`). Controllers don't have
  the post-save state to log meaningfully.
- **Errors bubble up.** `error-handler` middleware catches every thrown error
  and renders the standard envelope. Controllers must not `try/catch`.
- **Validation is middleware.** `validateBody(schema)` runs before the
  controller, so by the time `req.body` is read it's already typed and parsed.
- **Permissions are middleware.** `requirePermission(...)` runs first.
  A 403 never reaches the controller.

## Response helpers (`common/response.ts`)

Always use these — they enforce the response envelope:

| Helper | Status | Shape |
|---|---|---|
| `successResponse(res, data)` | 200 | `{ success: true, data }` |
| `successResponse(res, data, meta)` | 200 | `{ success: true, data, meta }` |
| `paginatedResponse(res, items, meta)` | 200 | `{ success: true, data: items, meta }` |
| `createdResponse(res, data)` | 201 | `{ success: true, data }` |
| `noContentResponse(res)` | 204 | empty |

Never `res.json(...)` directly from a controller — clients depend on the
envelope shape.

## Standard CRUD shape

```typescript
import { Request, Response } from 'express';
import * as service from './promotions.service';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
  noContentResponse,
} from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getSummary(req: Request, res: Response) {
  const data = await service.findSummary(req.query as Record<string, unknown>);
  return successResponse(res, data);
}

export async function getById(req: Request, res: Response) {
  const item = await service.findById(req.params.id);
  return successResponse(res, item);
}

export async function create(req: Request, res: Response) {
  const item = await service.create(req.body);
  return createdResponse(res, item);
}

export async function update(req: Request, res: Response) {
  const item = await service.update(req.params.id, req.body);
  return successResponse(res, item);
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id);
  return noContentResponse(res);
}
```

## Pulling caller info from `req.user`

`verifyToken` middleware populates `req.user = { id, permissions, ... }`.
The controller forwards what the service needs — **don't** pass the whole
`req.user` object.

```typescript
export async function create(req: Request, res: Response) {
  const userPermissions: string[] = (req as any).user?.permissions ?? [];
  const item = await service.create(req.body, userPermissions);
  return createdResponse(res, item);
}
```

The service signature should accept the specific scalars it needs
(`userPermissions: string[]`, `userId: string`), not a synthetic "current user"
object — keeps services callable from listeners and tests without faking Express.

## Friendly identifiers (e.g. order number → UUID)

When endpoints accept human-friendly ids (e.g. `N1234` or a numeric order
number) the controller resolves them to a UUID by calling the service's own
resolver, then continues:

```typescript
export async function confirm(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.confirm(uuid);
  return successResponse(res, item);
}
```

`resolveToUUID` lives in the service so it has access to the repo and throws
the project's `NotFoundError`. See `orders.service.ts` for the canonical
implementation.

## Workflow / state-transition endpoints

One controller method per transition, mapping 1:1 to a service function and
to a `POST /:id/<verb>` route:

```typescript
export async function submit(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.submit(uuid);
  return successResponse(res, item);
}

export async function cancel(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.cancel(uuid);
  return successResponse(res, item);
}
```

Repetition is fine here — the upside is that each transition is greppable and
each route declares its own permission in the router.

## What NOT to do

```typescript
// ❌ Try/catch in controller
export async function create(req, res) {
  try {
    const item = await service.create(req.body);
    return createdResponse(res, item);
  } catch (e) {
    return errorResponse(res, 500, 'ERR', e.message);   // bypasses error-handler
  }
}

// ❌ Business logic in controller
export async function create(req, res) {
  if (req.body.total > 100000 && !req.user.isAdmin) {   // belongs in the service
    return errorResponse(res, 403, 'BIG_ORDER', '...');
  }
  const item = await service.create(req.body);
  return createdResponse(res, item);
}

// ❌ Logging in controller
export async function create(req, res) {
  logger.info('creating promotion', { body: req.body });   // wrong layer
  const item = await service.create(req.body);
  return createdResponse(res, item);
}

// ❌ Direct repo access in controller
export async function getById(req, res) {
  const item = await AppDataSource.getRepository(Promotion).findOne(...);   // call the service
  return successResponse(res, item);
}

// ❌ Manual envelope
export async function create(req, res) {
  const item = await service.create(req.body);
  return res.status(201).json({ ok: true, payload: item });   // wrong shape
}

// ❌ Forwarding the whole req.user into the service
const item = await service.create(req.body, req.user);   // tight coupling to Express
```

## Checklist per controller method

- [ ] Function body is 3–5 lines
- [ ] Calls exactly one service function
- [ ] Returns through a `*Response` helper from `common/response.ts`
- [ ] No `try/catch`, no `logger.*`, no `AppDataSource.*`
- [ ] No business decisions (those are in the service)
- [ ] If the route accepts a friendly id, calls `service.resolveToUUID(...)` first
- [ ] If the action needs caller context, forwards specific scalars (`userId`,
      `userPermissions`), not the whole `req.user`
