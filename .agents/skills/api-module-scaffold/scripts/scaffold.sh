#!/usr/bin/env bash
# Scaffold a new ERP API module under api/src/modules/<module>/.
#
# Generates 6 stub files (entity, events, schema, service, controller, router)
# that compile against this codebase's common helpers. Doesn't touch
# router.ts, permissions.constants.ts, listeners.ts, or migrations — those
# require human review and are listed as next steps at the end.
#
# Usage:   scripts/scaffold.sh <module-plural-kebab> <EntityPascal>
# Example: scripts/scaffold.sh promotions Promotion
#          scripts/scaffold.sh sales-zones SalesZone
#          scripts/scaffold.sh inventory-counts InventoryCount

set -euo pipefail

if [[ $# -ne 2 ]]; then
  cat >&2 <<USAGE
Usage: $0 <module-plural-kebab> <EntityPascal>

  module-plural-kebab   directory + URL path, e.g. "promotions", "sales-zones"
  EntityPascal          entity class prefix, e.g. "Promotion", "SalesZone"

Examples:
  $0 promotions Promotion
  $0 sales-zones SalesZone
  $0 inventory-counts InventoryCount
USAGE
  exit 1
fi

MODULE="$1"
ENTITY="$2"

# Derive: SalesZone   -> sales-zone   (singular kebab for entity filename)
SINGULAR_KEBAB=$(echo "$ENTITY" | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' | tr 'A-Z' 'a-z')
# Derive: SalesZone   -> salesZone    (camelCase prop / id field)
ENTITY_CAMEL="$(echo "${ENTITY:0:1}" | tr 'A-Z' 'a-z')${ENTITY:1}"
# Derive: sales-zones -> sales_zones  (DB table + permission resource)
SNAKE_PLURAL=$(echo "$MODULE" | tr '-' '_')
# Derive: sales-zones -> SALES_ZONES  (PERMISSIONS key)
PERM_KEY=$(echo "$MODULE" | tr 'a-z-' 'A-Z_')
# Derive: SalesZone   -> sales_zone   (event prefix singular)
EVENT_PREFIX=$(echo "$ENTITY" | sed -E 's/([a-z0-9])([A-Z])/\1_\2/g' | tr 'A-Z' 'a-z')
# Derive: sales-zones -> salesZones   (camelCase plural for router import name)
MODULE_CAMEL=$(echo "$MODULE" | awk -F'-' '{out=$1; for(i=2;i<=NF;i++) out=out toupper(substr($i,1,1)) substr($i,2); print out}')

# Locate api/src/modules from CWD or a parent.
if [[ -d "api/src/modules" ]]; then
  ROOT="api/src/modules"
elif [[ -d "src/modules" ]]; then
  ROOT="src/modules"
else
  echo "ERROR: can't find api/src/modules. Run from project root or api/." >&2
  exit 1
fi

DIR="$ROOT/$MODULE"
if [[ -e "$DIR" ]]; then
  echo "ERROR: $DIR already exists. Refusing to overwrite." >&2
  exit 1
fi

mkdir -p "$DIR/data_access"

# 1. Entity ------------------------------------------------------------------
cat > "$DIR/data_access/${SINGULAR_KEBAB}.entity.ts" <<EOF
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('${SNAKE_PLURAL}')
export class ${ENTITY}Entity extends BaseEntity {
  @Column({ name: 'name' })
  name!: string;

  @Column({ name: 'status', default: 'active' })
  status!: string;
}
EOF

# 2. Events ------------------------------------------------------------------
cat > "$DIR/${MODULE}.events.ts" <<EOF
export const ${ENTITY}Events = {
  CREATED: '${EVENT_PREFIX}.created',
  UPDATED: '${EVENT_PREFIX}.updated',
  DELETED: '${EVENT_PREFIX}.deleted',
} as const;
EOF

# 3. Schema ------------------------------------------------------------------
cat > "$DIR/${MODULE}.schema.ts" <<EOF
import { z } from 'zod';

export const Create${ENTITY}Schema = z.object({
  name: z.string().min(1),
});

export const Update${ENTITY}Schema = Create${ENTITY}Schema.partial();
EOF

# 4. Service -----------------------------------------------------------------
cat > "$DIR/${MODULE}.service.ts" <<EOF
import { AppDataSource } from '../../config/data-source';
import { ${ENTITY}Entity } from './data_access/${SINGULAR_KEBAB}.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { ${ENTITY}Events } from './${MODULE}.events';
import { logger } from '../../common/logger';

const log = logger.child({ context: { layer: 'service', module: '${MODULE}' } });
const repo = AppDataSource.getRepository(${ENTITY}Entity);

const COLUMNS: ColumnMap = {
  status: { type: 'enum',   column: 'status' },
  name:   { type: 'string', column: 'name' },
};
const SORTABLE: SortableMap = {
  name:      'r.name',
  createdAt: 'r.createdAt',
};
const SEARCH = ['r.name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('r');
  query.applyTo(qb, 'r', COLUMNS, SORTABLE, SEARCH, { field: 'createdAt', direction: 'DESC' });
  const total = await qb.getCount();
  const items = await qb.getMany();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('${ENTITY} no encontrado');
  return item;
}

export async function create(data: Partial<${ENTITY}Entity>) {
  const saved = await repo.save(repo.create(data));
  log.info('${ENTITY} created', { method: 'create', ${ENTITY_CAMEL}Id: saved.id });
  eventBus.emit(${ENTITY}Events.CREATED, saved);
  return saved;
}

export async function update(id: string, data: Partial<${ENTITY}Entity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  log.info('${ENTITY} updated', { method: 'update', ${ENTITY_CAMEL}Id: id });
  eventBus.emit(${ENTITY}Events.UPDATED, saved);
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  log.info('${ENTITY} deleted', { method: 'remove', ${ENTITY_CAMEL}Id: id });
  eventBus.emit(${ENTITY}Events.DELETED, { id });
}
EOF

# 5. Controller --------------------------------------------------------------
cat > "$DIR/${MODULE}.controller.ts" <<EOF
import { Request, Response } from 'express';
import * as service from './${MODULE}.service';
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
EOF

# 6. Router ------------------------------------------------------------------
cat > "$DIR/${MODULE}.router.ts" <<EOF
import { Router } from 'express';
import * as controller from './${MODULE}.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { Create${ENTITY}Schema, Update${ENTITY}Schema } from './${MODULE}.schema';

const router = Router();

router.get('/',       requirePermission(PERMISSIONS.${PERM_KEY}.VIEW),   controller.getAll);
router.get('/:id',    requirePermission(PERMISSIONS.${PERM_KEY}.VIEW),   controller.getById);
router.post('/',      requirePermission(PERMISSIONS.${PERM_KEY}.CREATE),
                      validateBody(Create${ENTITY}Schema), controller.create);
router.put('/:id',    requirePermission(PERMISSIONS.${PERM_KEY}.UPDATE),
                      validateBody(Update${ENTITY}Schema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.${PERM_KEY}.DELETE), controller.remove);

export default router;
EOF

# Final report ---------------------------------------------------------------
cat <<DONE

✓ Scaffolded $DIR with 6 files:
    data_access/${SINGULAR_KEBAB}.entity.ts
    ${MODULE}.events.ts
    ${MODULE}.schema.ts
    ${MODULE}.service.ts
    ${MODULE}.controller.ts
    ${MODULE}.router.ts

Next steps (manual — these need human review):

1. api/src/modules/permissions/permissions.constants.ts
   Add the ${PERM_KEY} block (alphabetical):

       ${PERM_KEY}: {
         VIEW:   '${SNAKE_PLURAL}:view',
         CREATE: '${SNAKE_PLURAL}:create',
         UPDATE: '${SNAKE_PLURAL}:update',
         DELETE: '${SNAKE_PLURAL}:delete',
       },

2. api/src/router.ts
   Import and mount under the protected section (after verifyToken, requestContext):

       import ${MODULE_CAMEL}Router from './modules/${MODULE}/${MODULE}.router';
       apiRouter.use('/${MODULE}', ${MODULE_CAMEL}Router);

3. Generate the migration:

       cd api && npm run migration:generate -- src/migrations/Create${ENTITY}s

   Review the generated SQL before running — TypeORM frequently picks varchar(255)
   when you want text, etc.

4. Edit the entity to add the real columns for your domain. The stub ships with
   only \`name\` + \`status\`.

5. If this module reacts to events from other modules, create
   ${MODULE}.listeners.ts and register in src/modules/listeners.ts.

6. Smoke test:

       curl -sS -H "Authorization: Bearer \$TOKEN" \\
         "http://localhost:3000/api/${MODULE}?page=1&limit=3" | jq

See .agents/skills/api-module-scaffold/SKILL.md for the full checklist.
DONE
