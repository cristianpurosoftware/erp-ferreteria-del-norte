---
name: api-module-scaffold
description: |
  End-to-end scaffolding recipe for new modules under `api/src/modules/<name>/`
  in this ERP — file order, reference modules to copy, router/permissions/migration
  wiring, and smoke test. Ships with `scripts/scaffold.sh <module> <Entity>` to
  generate the 6 boilerplate files in one command. Use this skill whenever the
  user wants a new resource or endpoint group ("agregar módulo X", "nuevo endpoint
  /Y", "scaffold X", "crear CRUD para Z"), whenever an agent is about to create
  the first file in a fresh `api/src/modules/<name>/` directory (even if not asked
  to "scaffold"), or when reviewing a freshly-added module to verify all 12 wiring
  steps are done. Composes with api-data-access, api-logging, api-controller,
  api-permissions, api-events, api-errors, and server-side-table.
---

# Scaffolding a new API module

## Pick a reference module first

Don't write from scratch — copy the closest match and edit. Two canonical references:

| Use case | Reference module |
|---|---|
| Simple CRUD (master data, lookup tables) | `api/src/modules/categories/` |
| Workflow with state machine, totals, joins, summary | `api/src/modules/orders/` |

Mirror the chosen module's file layout, import order, and naming. If your domain
sits between the two (e.g. CRUD with one workflow action), start from
`categories/` and add transitions piecewise.

## Fast path: `scripts/scaffold.sh`

For a vanilla CRUD module, run the bundled script from the project root and
skip steps 1–7 below — it generates all 6 files with stubs that compile
against the codebase's helpers (`BaseEntity`, `ListQuery`, `logger.child`,
`AppDataSource.getRepository`, `eventBus`, `successResponse`, ...).

```bash
.agents/skills/api-module-scaffold/scripts/scaffold.sh <module-plural-kebab> <EntityPascal>

# examples
.agents/skills/api-module-scaffold/scripts/scaffold.sh promotions Promotion
.agents/skills/api-module-scaffold/scripts/scaffold.sh sales-zones SalesZone
.agents/skills/api-module-scaffold/scripts/scaffold.sh inventory-counts InventoryCount
```

The script:
- refuses to overwrite an existing directory
- writes `entity / events / schema / service / controller / router` with valid
  TS, kebab-case filenames, snake_case table, PascalCase entity class
- prints the **next steps** at the end (permissions block to add, router
  registration, migration command) — those still need human review

After the script runs, jump to step 8 below (permissions constants) and
continue. Edit the entity to add real domain columns; the stub ships with
only `name + status`.

## File creation order

Follow this order — each step depends on the previous one:

1. **Entity** → `data_access/<name>.entity.ts` (extends `BaseEntity`)
2. **Events constants** → `<name>.events.ts`
3. **Schema (zod)** → `<name>.schema.ts`
4. **Service** → `<name>.service.ts` (logic, repos, transitions, logging)
5. **Controller** → `<name>.controller.ts` (thin pass-through)
6. **Router** → `<name>.router.ts` (permissions + validation)
7. **Listeners (if reacts to other modules)** → `<name>.listeners.ts`
8. **Permissions constants** → edit `modules/permissions/permissions.constants.ts`
9. **Router registration** → edit `src/router.ts`
10. **Listener registration (if step 7)** → edit `src/modules/listeners.ts`
11. **Migration** → `npm run migration:generate -- src/migrations/<Description>`
12. **Seed (if reference data)** → `src/seeds/<name>.seed.ts`

## Per-file templates

### 1. Entity (`data_access/<name>.entity.ts`)

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('promotions')   // snake_case plural table name
export class PromotionEntity extends BaseEntity {
  @Column({ name: 'name' })
  name!: string;

  @Column({ name: 'discount_pct', type: 'numeric', precision: 5, scale: 2 })
  discountPct!: number;

  @Column({ name: 'status', default: 'draft' })
  status!: string;        // see api-errors and state-machine for transitions

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt!: Date | null;
}
```

Rules:
- Singular PascalCase class name (`PromotionEntity`), plural snake_case table.
- Properties camelCase in TS, `{ name: 'snake_case' }` in DB.
- Always extend `BaseEntity` (gives you `id`, timestamps, soft-delete, `metadata`).
- Use `metadata: jsonb` (already on `BaseEntity`) for accessory fields — see CLAUDE.md
  "Cuándo usar metadata JSONB vs columna real".

### 2. Events (`<name>.events.ts`)

```typescript
export const PromotionEvents = {
  CREATED:    'promotion.created',
  UPDATED:    'promotion.updated',
  DELETED:    'promotion.deleted',
  ACTIVATED:  'promotion.activated',
} as const;
```

See `api-events` skill for the full lifecycle. Every business action must
emit one — the audit listener is wired via the event-bus tap and depends on
the `<entity>.<action>` shape.

### 3. Schema (`<name>.schema.ts`)

```typescript
import { z } from 'zod';

export const CreatePromotionSchema = z.object({
  name:         z.string().min(1),
  discountPct:  z.number().min(0).max(100),
  startsAt:     z.string().datetime().optional(),
});

export const UpdatePromotionSchema = CreatePromotionSchema.partial();
```

### 4. Service (`<name>.service.ts`)

See `api-data-access` for repo declaration, `api-logging` for the `log = logger.child(...)`
pattern, `server-side-table` for `findAll` + `findSummary`, and `api-errors` for
which exception to throw.

Minimum CRUD shape:

```typescript
import { AppDataSource } from '../../config/data-source';
import { PromotionEntity } from './data_access/promotion.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { PromotionEvents } from './promotions.events';
import { logger } from '../../common/logger';

const log = logger.child({ context: { layer: 'service', module: 'promotions' } });
const repo = AppDataSource.getRepository(PromotionEntity);

const COLUMNS: ColumnMap = {
  status: { type: 'enum',   column: 'status' },
  name:   { type: 'string', column: 'name' },
};
const SORTABLE: SortableMap = { name: 'p.name', createdAt: 'p.createdAt' };

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('p');
  query.applyTo(qb, 'p', COLUMNS, SORTABLE, ['p.name'], { field: 'createdAt', direction: 'DESC' });
  const total = await qb.getCount();
  const items = await qb.getMany();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Promoción no encontrada');
  return item;
}

export async function create(data: any) {
  const saved = await repo.save(repo.create(data));
  log.info('Promotion created', { method: 'create', promotionId: saved.id, name: saved.name });
  eventBus.emit(PromotionEvents.CREATED, saved);
  return saved;
}
```

### 5. Controller (`<name>.controller.ts`)

See `api-controller` skill — controllers are pure pass-through.

### 6. Router (`<name>.router.ts`)

```typescript
import { Router } from 'express';
import * as controller from './promotions.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreatePromotionSchema, UpdatePromotionSchema } from './promotions.schema';

const router = Router();

router.get('/',         requirePermission(PERMISSIONS.PROMOTIONS.VIEW), controller.getAll);
router.get('/summary',  requirePermission(PERMISSIONS.PROMOTIONS.VIEW), controller.getSummary);
router.get('/:id',      requirePermission(PERMISSIONS.PROMOTIONS.VIEW), controller.getById);
router.post('/',        requirePermission(PERMISSIONS.PROMOTIONS.CREATE),
                        validateBody(CreatePromotionSchema), controller.create);
router.put('/:id',      requirePermission(PERMISSIONS.PROMOTIONS.UPDATE),
                        validateBody(UpdatePromotionSchema), controller.update);
router.delete('/:id',   requirePermission(PERMISSIONS.PROMOTIONS.DELETE), controller.remove);

export default router;
```

**Critical:** `/summary` must come BEFORE `/:id` — see `server-side-table`.

### 8. Permissions constants

See `api-permissions` skill. Add the block in `permissions.constants.ts`
**before** referencing `PERMISSIONS.PROMOTIONS.X` in the router (TS will
otherwise refuse to compile).

### 9. Router registration (`src/router.ts`)

Add the import alphabetically near the other module routers, then mount it
under the protected section (after `verifyToken, requestContext`):

```typescript
import promotionsRouter from './modules/promotions/promotions.router';
// ...
apiRouter.use('/promotions', promotionsRouter);
```

Endpoint path is **kebab-case plural** — match the file's directory name.

### 10. Listener registration (only if you wrote `<name>.listeners.ts`)

Add to `src/modules/listeners.ts`:

```typescript
import { registerPromotionsListeners } from './promotions/promotions.listeners';
// inside registerListeners():
registerPromotionsListeners();
```

### 11. Migration

```bash
cd api
npm run migration:generate -- src/migrations/CreatePromotions
```

TypeORM diff-generates the SQL by comparing the entity to the live DB schema.
Open the generated file, verify it actually creates `promotions` (not random
drift), and adjust column types/defaults if the generator picked the wrong
Postgres type.

### 12. Seed (only for reference / lookup data)

Add a new file under `src/seeds/` and wire it into the seed entry point if it
must run on bootstrap.

## Smoke test before declaring done

```bash
# 1. App boots
cd api && npm run dev

# 2. Endpoint responds with the standard envelope
curl -sS -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/promotions?page=1&limit=3" | jq

# 3. Detail endpoint
curl -sS -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/promotions/<uuid>" | jq

# 4. Permission gate works (call with a token whose role lacks the perm → 403)
```

Expected envelope:

```json
{ "success": true, "data": [...], "meta": { "page": 1, "limit": 3, "total": N, "totalPages": ... } }
```

## Final checklist

- [ ] Entity extends `BaseEntity`, snake_case table, camelCase props with `{ name }`
- [ ] Events constants file exists and uses `<entity>.<action>` strings
- [ ] Service: `log = logger.child({ context: { layer: 'service', module: '<name>' } })`
- [ ] Service: top-level `const repo = AppDataSource.getRepository(...)` (no `() =>`)
- [ ] Service: every create / update / state transition / delete emits an event AND logs
- [ ] Controller: thin pass-through, no logs, no business logic
- [ ] Router: `/summary` BEFORE `/:id`; every route guarded by `requirePermission(PERMISSIONS.X.Y)`
- [ ] Router: mutating routes use `validateBody(<schema>)` from `middlewares/validate`
- [ ] `permissions.constants.ts` has the block for the new module
- [ ] `src/router.ts` imports and mounts the new router under protected section
- [ ] If listeners exist: `src/modules/listeners.ts` registers them
- [ ] Migration generated, reviewed, runs cleanly on a fresh DB
- [ ] `curl` round-trips list / detail / create / 403-on-unauthorized

## Anti-patterns

- ❌ Adding business logic to the controller (see `api-controller`)
- ❌ Skipping `eventBus.emit(...)` "because nobody is listening yet" — audit tap is always listening
- ❌ Hardcoding permission strings in the router (`'promotions:create'`) instead of `PERMISSIONS.PROMOTIONS.CREATE`
- ❌ Registering the router before `verifyToken, requestContext` — endpoint becomes unauthenticated
- ❌ Using `findOne` / `findOneByOrFail` directly without throwing the project's `NotFoundError`
- ❌ Inventing a new response envelope — always use helpers from `common/response.ts`
- ❌ Generating a migration without reviewing it — TypeORM frequently picks `varchar(255)` when you want `text`, etc.
