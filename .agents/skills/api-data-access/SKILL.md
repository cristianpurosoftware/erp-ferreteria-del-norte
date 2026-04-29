---
name: api-data-access
description: |
  TypeORM repository pattern for this ERP — declare repos at the top level of a
  service file as plain `const repo = AppDataSource.getRepository(Entity)` (never
  as a function `() =>`); inside `withTransaction((em) => ...)` use
  `em.getRepository(Entity)` so the work joins the transaction; for foreign-module
  entities prefer calling that module's service over inlining the repo. Use this
  skill whenever creating a new module, adding an entity, refactoring data
  access, when an agent is about to write `const repo = () => AppDataSource...`
  (the legacy function form), when crossing module boundaries from one service
  into another's entity, when wrapping work in `withTransaction`, when seeing a
  `customerCount = await repo.count()` at module scope (will crash before
  initialize), or when the user asks "why is the repo a const instead of a
  function?" / "should this be a transaction?" / "where do I put this query?".
  Pair with api-module-scaffold (already follows this pattern), api-errors
  (services throw `NotFoundError` on missing rows), and api-logging (services
  log after persistence).
---

# API Data Access — TypeORM repository pattern

## Rule

Declare repositories at the **top level of the service file** as plain `const`,
not as functions:

```typescript
// ✅ Correct
import { AppDataSource } from '../../config/data-source';
import { OrderEntity } from './data_access/order.entity';
import { OrderItemEntity } from './data_access/order-item.entity';

const orderRepo = AppDataSource.getRepository(OrderEntity);
const itemRepo  = AppDataSource.getRepository(OrderItemEntity);

export async function findById(id: string) {
  return orderRepo.findOne({ where: { id } });
}
```

```typescript
// ❌ Don't (legacy pattern — the parens add nothing useful)
const orderRepo = () => AppDataSource.getRepository(OrderEntity);

export async function findById(id: string) {
  return orderRepo().findOne({ where: { id } });
}
```

## Why top-level `const` is safe

`AppDataSource` is **constructed eagerly** in `api/src/config/data-source.ts`
(via `new DataSource(...)` at module load). `getRepository(Entity)` on a
constructed-but-not-yet-initialized DataSource is a cheap, synchronous lookup
that returns a `Repository<Entity>` wrapper. The wrapper holds a reference to
the DataSource and only consults it at **query time** (`findOne`, `save`, ...).

By the time any query fires (inside a route handler, listener, or seed),
`bootstrap()` in `api/src/index.ts` has already called
`AppDataSource.initialize()`. Module-load order is irrelevant — the wrapper
doesn't care whether initialize has run yet, only whether it has run by the
first call.

## Hard rule — never call repo methods at module scope

```typescript
// ❌ This crashes — runs at module load, before initialize()
const customerCount = await customerRepo.count();
```

Anything that actually queries the DB has to live inside a function that is
called after bootstrap.

## Transactions — use the `manager` parameter

Inside `withTransaction((em) => ...)` (`api/src/common/transaction.ts`), get
repos from the entity manager so the work is part of the transaction:

```typescript
import { withTransaction } from '../../common/transaction';

export async function update(id: string, data: UpdateOrderBody) {
  return withTransaction(async (em) => {
    const orderTx = em.getRepository(OrderEntity);
    const itemTx  = em.getRepository(OrderItemEntity);

    const order = await orderTx.findOne({ where: { id }, relations: ['items'] });
    // ... mutate ...
    return orderTx.save(order);
  });
}
```

Don't mix the module-scope `orderRepo` with `em.getRepository(OrderEntity)` in
the same transaction — work done through the module-scope repo bypasses the
transaction.

## Module boundaries — own vs foreign entities

Top-level `const xxxRepo` declarations are for **the module's own entities**.
For entities owned by **another module**, prefer calling that module's service.
Only fall back to inline `AppDataSource.getRepository(ForeignEntity)` for
trivial one-off reads where the foreign module doesn't already expose what
you need.

```typescript
// orders.service.ts — own entities at the top
const orderRepo = AppDataSource.getRepository(OrderEntity);
const itemRepo  = AppDataSource.getRepository(OrderItemEntity);

// ✅ best: cross-module via the foreign service (respects its rules)
import { checkCredit } from '../customers/customers.service';
await checkCredit(customerId, total);

// ⚠️ acceptable: trivial one-off read of a foreign entity
const customer = await AppDataSource.getRepository(CustomerEntity).findOne({
  where: { id: data.customerId },
});

// ❌ bad: top-level customerRepo inside orders.service.ts
const customerRepo = AppDataSource.getRepository(CustomerEntity);
// hides the boundary crossing — a future reader thinks customers is owned here
```

The "visible inline" form (`AppDataSource.getRepository(ForeignEntity)`) is
load-bearing: it makes the module crossing obvious so a future refactor toward
a proper service call is easier to spot.

## Naming convention

- Primary repo of the module: `repo` (when it's the only one) or `<entity>Repo`
- Secondary repos for the module's own entities: `<entity>Repo` (`itemRepo`,
  `lineRepo`)
- Foreign-entity lookups: inline, no top-level alias
- Match what the rest of the codebase uses — grep before inventing a new name.

## Where this lives

- DataSource construction → `api/src/config/data-source.ts`
- DataSource initialization → `api/src/index.ts` (`bootstrap()`)
- Test DataSource lifecycle → `api/tests/integration/helpers/db.ts` (idempotent
  `initDb`, table-truncating `resetDb` — never destroys/recreates the DataSource)

## Checklist when creating a new module

- [ ] Import `AppDataSource` and the entity classes at the top
- [ ] Declare each **own-module** repo as `const xxxRepo = AppDataSource.getRepository(Xxx)` — no `() =>`
- [ ] For **foreign entities**: prefer calling the foreign service; only inline
      `AppDataSource.getRepository(ForeignEntity)` for trivial reads
- [ ] Never call a repo method at module scope
- [ ] Inside `withTransaction`, use the manager's repos (`em.getRepository(Xxx)`),
      not the module-scope repos
- [ ] If you find yourself reaching for `() =>` defensiveness, you don't need it —
      the wrapper is lazy on its own
