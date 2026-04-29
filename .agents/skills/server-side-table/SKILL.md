---
name: server-side-table
description: |
  Server-side data table pattern for this ERP — backend `ListQuery` helper +
  `findAll`/`findSummary` services, frontend `buildListQuery` +
  `useDataTable({ manualMode: true })` + dual `useEffect`s for list and
  summary, default `limit=10`, `/summary` route always before `/:id`. Covers
  the migration playbook (this file) and the UI cookbook for cells, status
  badges, dates, money, single SearchInput, Actions dropdown with permission
  gating, and dual-mode Excel export (`references/ui-cookbook.md`). Use this
  skill whenever the user says "server-side pagination", "migrar tabla",
  "paginar X del lado servidor", "tabla bien armada", "agregar filtro a la
  tabla X", when adding or editing any file under
  `frontend/app/(app)/<module>/page.tsx` that renders a list, when an agent
  is about to call `getX({ limit: 500 })` or compute `reduce` totals from
  in-memory rows (both anti-patterns), when adding a new column with status
  / enum / date, when the Actions cell is a row of inline icons instead of a
  dropdown, or when reviewing a table page that mixes English in cells. Pair
  with api-module-scaffold (new module exposes a list endpoint) and
  api-permissions (Actions dropdown gates each item per `PERMISSIONS.X.Y`).
---

# Server-side data tables — ERP pattern

This SKILL.md is the **migration playbook**: the contract between frontend and
backend, how to write `findAll` / `findSummary`, how to wire the page in
`useDataTable` manual mode, and the per-page checklist.

For UI rendering rules (Spanish labels, status pills, date+time, page size,
single SearchInput), the **Actions dropdown** with permission gating, and the
dual-mode Excel export, read [`references/ui-cookbook.md`](./references/ui-cookbook.md).
That file is loaded only when an agent is editing cells, the search box, the
Actions column, or the export button.

## Contract (query params)

Shared between frontend (`frontend/lib/list-query.ts`) and backend
(`api/src/common/list-query.ts`).

| Purpose | Param | Format | Example |
|---|---|---|---|
| Pagination | `page` | int ≥ 1 | `page=3` |
| Page size | `limit` | int | `limit=10` |
| Multi-sort | `sort` | `col:asc\|desc` CSV | `sort=total:desc,createdAt:desc` |
| Full-text | `q` | string | `q=coca` |
| Equality (string) | `<col>` | ILIKE `%v%` | `name=coca` |
| Enum / multi-select | `<col>` | CSV | `status=active,inactive` |
| Number range | `<col>Min` / `<col>Max` | number | `basePriceMin=100&basePriceMax=500` |
| Date range | `<col>From` / `<col>To` | ISO date | `createdAtFrom=2026-01-01` |
| Boolean | `<col>` | `true` / `false` | `controlsStock=true` |

Defaults: `page=1`, **`limit=10`** (always — UI and initial fetch must match).
Response envelope: `{ success: true, data: [...], meta: { page, limit, total, totalPages } }`.

---

## Backend

### 1. Service: `findAll` + optional `findSummary`

```ts
// api/src/modules/<module>/<module>.service.ts
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';

const MODULE_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  customerId:   { type: 'enum',   column: 'customerId' },
  total:        { type: 'number', column: 'total' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  // When the filterable value lives on a joined table, use `sql` instead of `column`:
  customerName: { type: 'string', sql: 'COALESCE(c.commercial_name, c.legal_name)' },
};

const MODULE_SORTABLE: SortableMap = {
  createdAt:    'o.createdAt',
  total:        'o.total',
  customerName: 'COALESCE(c.commercial_name, c.legal_name)', // raw SQL for joined cols
};

const MODULE_SEARCH = [
  'o.number',
  'COALESCE(c.commercial_name, c.legal_name)',
];
// SEARCH columns are matched with unaccent(lower(...)) LIKE unaccent(lower(:q))
// by list-query.ts — Jose matches José, PEREZ matches Pérez.
// For joined-table columns use the actual SQL column (e.g. 'c.commercial_name'),
// NOT the TypeORM property alias ('c.commercialName') — the latter is not valid
// raw SQL and will cause a PostgreSQL column-not-found error.

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo().createQueryBuilder('o')
    .leftJoin('customers', 'c', 'c.id::text = o.customer_id')
    .addSelect('COALESCE(c.commercial_name, c.legal_name)', 'customerName');

  query.applyTo(qb, 'o', MODULE_COLUMNS, MODULE_SORTABLE, MODULE_SEARCH, {
    field: 'createdAt',
    direction: 'DESC',
  });

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    customerName: raw[i]?.customerName ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

/** Aggregate counters for the header — respects same filters as findAll. */
export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo().createQueryBuilder('o')
    .leftJoin('customers', 'c', 'c.id::text = o.customer_id')
    .select('COUNT(o.id)', 'total')
    .addSelect('COALESCE(SUM(o.total), 0)', 'totalAmount');
  query.applyFilters(qb, 'o', MODULE_COLUMNS, MODULE_SEARCH);
  const row = await qb.getRawOne();
  return {
    total: Number(row?.total ?? 0),
    totalAmount: Number(row?.totalAmount ?? 0),
  };
}
```

### 2. Controller (thin)

```ts
export async function getAll(req, res) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  paginatedResponse(res, items, meta);
}
export async function getSummary(req, res) {
  const data = await service.findSummary(req.query as Record<string, unknown>);
  successResponse(res, data);
}
```

### 3. Router — `/summary` BEFORE `/:id`

```ts
router.get('/', requirePermission(...), controller.getAll);
router.get('/summary', requirePermission(...), controller.getSummary); // ← critical
router.get('/:id', requirePermission(...), controller.getById);
```

If `/summary` comes after `/:id`, Express treats "summary" as an id and the route breaks.

---

## Frontend

### 1. Endpoints (`lib/api/endpoints/<module>.ts`)

```ts
export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>) {
  return fetchPaginated<T>('/<module>', params);
}

export async function getSummary(query?: string): Promise<XSummary> {
  const suffix = query ? `?${query}` : '';
  return fetchApi<XSummary>(`/<module>/summary${suffix}`);
}
```

### 2. Server actions (`lib/actions/<module>.ts`)

Keep `getX(record)` for legacy callers; add two new ones:

```ts
export async function getXQuery(query: string)   { return xApi.getAll(new URLSearchParams(query)); }
export async function getXSummary(query?: string) { return xApi.getSummary(query); }
```

### 3. Page shape (`app/(app)/<module>/page.tsx`)

```tsx
const [data, setData] = useState<T[]>([]);
const [pageCount, setPageCount] = useState(1);
const [totalRows, setTotalRows] = useState(0);
const [totalAmount, setTotalAmount] = useState(0);

const { table } = useDataTable({
  data,
  columns,
  pageCount,              // from server
  manualMode: true,       // ← server-side
  initialState: {
    sorting: [{ id: 'createdAt', desc: true }],
    pagination: { pageIndex: 0, pageSize: 10 },   // default 10
  },
});

const state = table.getState();
const filterParams = React.useMemo(
  () => buildListQuery({
    pagination: state.pagination,
    sorting: state.sorting,
    filters: state.columnFilters,
  }).toString(),
  [state.pagination, state.sorting, state.columnFilters],
);

// Summary should NOT re-run when page/sort changes — strip them.
const summaryParams = React.useMemo(() => {
  const p = new URLSearchParams(filterParams);
  p.delete('page'); p.delete('limit'); p.delete('sort');
  return p.toString();
}, [filterParams]);

React.useEffect(() => {
  setLoading(true);
  getXQuery(filterParams).then((r) => {
    setData(r.items);
    setPageCount(r.meta.totalPages);
    setTotalRows(r.meta.total);
  }).finally(() => setLoading(false));
}, [filterParams]);

React.useEffect(() => {
  getXSummary(summaryParams)
    .then((s) => setTotalAmount(s.totalAmount))
    .catch(() => setTotalAmount(0));
}, [summaryParams]);

// Header counters come from summary, not from in-memory data
<p>{totalRows} items · Total: {formatMoney(totalAmount)}</p>
```

---

## UI cookbook → `references/ui-cookbook.md`

Cell-level concerns live in the [cookbook](./references/ui-cookbook.md) — load
it whenever an agent is editing or adding:

- Cells (Spanish labels, status pills, date+time, money, booleans, units)
- Column headers in Spanish
- The single global `<SearchInput>` (never per-column text filters)
- The page-size rule (default 10) and pagination footer hide-when-`<= 10`
- The Actions dropdown menu (last column, `align="end"`, permission-gated)
- Dual-mode Excel export ("Exportar página actual" + "Exportar todo (filtrado)")

If you skip the cookbook you'll re-invent these conventions and the table
will feel inconsistent next to existing pages (`pedidos`, `catalogo`, …).

---

## Backend search rules

- All text comparisons use `unaccent(lower(...)) LIKE unaccent(lower(:param))`, handled
  automatically by `api/src/common/list-query.ts` — no per-service changes needed.
- The `unaccent` PostgreSQL extension must be enabled. It ships as migration
  `1776570000000-AddUnaccentExtension.ts` — run it once per database.
- For `*_SEARCH` arrays: use raw SQL column names, not TypeORM property aliases:
  - ✅ `'p.external_reference'`, `'c.commercial_name'`, `'ve.plate'`
  - ❌ `'p.externalReference'`, `'c.commercialName'` (PostgreSQL doesn't resolve camelCase)
- `string` type filters in `ColumnMap` also use `unaccent` automatically.

---

## Migration checklist (per page)

1. **Backend service**: replace `PaginationQuery` usage with `ListQuery`. Define
   `COLUMNS`, `SORTABLE`, `SEARCH` constants. Keep the join+addSelect pattern for
   relation names.
2. **Backend controller**: pass `req.query` directly to the service. Add `getSummary`
   if the page has header counters.
3. **Backend router**: add `/summary` BEFORE `/:id`. Permission same as VIEW.
4. **Frontend endpoints**: accept `URLSearchParams | Record` on `getAll`. Add
   `getSummary(query?: string)`.
5. **Frontend action**: add `getXQuery(string)` and `getXSummary(string)` exports.
6. **Frontend page**:
   - Remove `limit: N` hardcodes; remove preload of all rows.
   - Flip `manualMode: true`, set `pageCount` from server meta.
   - Add `filterParams` / `summaryParams` memos and the two `useEffect`s.
   - Strip `filterFn`, `sortingFn`, `accessorFn` derived — server handles them.
   - Remove per-column text filters; route a single search box to `q`
     (see cookbook).
   - Header counters from summary.
   - Cells, badges, dates, Actions dropdown, export buttons → cookbook.
7. **Verify**: curl the endpoint with `?page=1&limit=3&sort=col:desc`, confirm
   `meta.total` and `data[]`. Hit `/summary` with the same filters and confirm
   aggregates match. Open the page, paginate, filter, confirm network tab shows
   only one fetch per change (list + summary).

---

## Anti-patterns

- `getX({ limit: 500 })` or similar pre-loading → delete.
- `orders.reduce((s, o) => s + o.total, 0)` for header totals → use `findSummary`.
- `manualMode: false` with `pageCount: -1` on a modern migrated page → bug.
- Text filter per column with `variant: 'text'` → merge into one `q` field.
- `filterFn: multiSelectFilterFn` + `manualMode: true` → contradictory; client fn won't run but imports linger.
- Rendering `row.original.customerId` as a cell → show `customerName` instead (via join or lookup).
- Separate `/api/orders/count` + `/api/orders/total` endpoints → one `/summary` returns both.
- `/summary` route declared after `/:id` → Express treats "summary" as an id and the route breaks.

---

## Reference implementations

- **Products** (catalog): `api/src/modules/products/products.service.ts` +
  `frontend/app/(app)/catalogo/page.tsx`
- **Orders** (with summary): `api/src/modules/orders/orders.service.ts` +
  `frontend/app/(app)/pedidos/page.tsx`

When in doubt, mirror these two files.
