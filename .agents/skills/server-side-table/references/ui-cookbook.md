# Server-side table — UI cookbook

Loaded by `server-side-table/SKILL.md` when an agent is editing cells, status
badges, dates, the search box, the Actions dropdown, or the Excel export of a
table page. Three groups: **rendering rules**, **row actions**, **export**.

## Rendering rules (UX)

### Never show raw IDs in rows
If the row contains `customerId`, `brandId`, `zoneId`, etc., the cell must render the
related **name / label**, not the UUID. Two ways to get it:

1. **Preferred**: backend joins pull the name via `addSelect` (see `customerName` in orders).
   This keeps the page light — no client-side map lookups.
2. If the backend doesn't join, load the lookup once as master data and dereference in the cell:
   ```tsx
   const c = categories.find((x) => x.id === row.original.categoryId);
   return <span>{c?.name ?? '—'}</span>;
   ```
   Acceptable for small reference sets (< 500 rows) that don't change per filter.

For enums stored as codes (`status`, `kind`, `type`, `direction`, …) use the `*_LABELS`
maps in `frontend/lib/types.ts` instead of the raw value:
```tsx
{ORDER_STATUS_LABELS[row.original.status] ?? row.original.status}
```

### Column headers are Spanish too

Every `header`, `meta.label`, `meta.placeholder`, and export header string is in Spanish
— same rule as cell values. No "Status", "Customer", "Date", "Actions" slipping
through in English. Common translations:

| English | Spanish |
|---|---|
| ID / Reference | Referencia (o `#`) |
| Name | Nombre |
| Status | Estado |
| Type / Kind | Tipo |
| Customer | Cliente |
| Supplier | Proveedor |
| Product | Producto |
| Brand | Marca |
| Category | Categoría |
| Date / Created | Fecha |
| Amount / Total | Total (or Monto) |
| Price | Precio |
| Cost | Costo |
| Quantity | Cantidad |
| Unit | Unidad |
| Action / Actions | (no header for the actions column — it's an empty string) |
| User | Usuario |
| Email | Email (aceptado) or Correo |
| Phone | Teléfono |
| Address | Dirección |
| Notes | Notas |
| Description | Descripción |
| Channel | Canal |
| Zone | Zona |
| Route | Ruta |
| Warehouse | Depósito |
| Branch | Sucursal |

Apply to `DataTableColumnHeader label`, plain `header` strings, `meta.label` (shown
in the column-visibility menu and filter popovers), and every entry of the
`headers={[]}` array passed to `ExportButton`.

### Everything rendered in a cell is Spanish

Zero English leaks into table rows. Every value a user sees — status, kind, type,
channel, direction, result, unit, boolean, enum — must be resolved to its Spanish
label before rendering. The API stores codes in snake_case English (`pending_confirmation`,
`in_transit`, `credit_received`, `iibb`, …) because they're stable identifiers, **not**
display labels.

- **Enums / codes → use the `*_LABELS` maps in `frontend/lib/types.ts`**.
  If a map doesn't exist yet for an enum you're rendering, add it there (alphabetically
  within its section). Fallback to the raw value only when the key is genuinely unknown:
  ```tsx
  {ORDER_STATUS_LABELS[row.original.status] ?? row.original.status}
  ```
- **Booleans → "Sí" / "No"**, never "true"/"false" or "Yes"/"No".
- **Currency → `formatMoney()`** (renders `$1.234,56`), not raw numbers with a dollar sign.
- **Dates → `toLocaleString('es-AR', …)`** or `formatDate()`, never an ISO string.
- **Unit-of-measure → resolve via `UNIT_LABELS` or the unit entity's `name`**. Don't
  show abbreviations like `g.`, `u.`, `ml.` raw — use "Gramos", "Unidades", "Mililitros".
- **Empty / null → `—`** (em dash), never "N/A" / "null" / "(none)".

If a backend response leaks English text into a user-facing string column
(e.g. some legacy field contains `"pending approval"` literally), translate in the cell
via a small inline map or request the API to return Spanish content. Never ship the
English string to the user.

Check at PR review: grep the diff for row cells that render `{row.original.status}`,
`{row.original.kind}`, `{row.original.type}` **without** a `_LABELS[...]` lookup —
that's a bug. Same for `capitalize` classes applied to raw enum codes.

### Status badges: pill-style span with tinted background

Status cells (and any enum-like pill: kind, result, direction, …) must use the same
pill style as `catalogo/page.tsx` — a `<span>` with `text-xs px-2 py-0.5 rounded-full
font-medium` plus a color class per value. **Do not** use the shadcn `<Badge>` component
here: it renders too heavy next to table text and breaks the visual rhythm.

```tsx
const statusColors: Record<ProductStatus, string> = {
  draft:         "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  active:        "bg-p3/10 text-p4 dark:text-p2",
  inactive:      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  discontinued:  "bg-red-500/10 text-red-600 dark:text-red-400",
};

{
  id: "status",
  accessorKey: "status",
  header: "Estado",
  cell: ({ row }) => (
    <span
      className={cn(
        "text-xs px-2 py-0.5 rounded-full font-medium",
        statusColors[row.original.status],
      )}
    >
      {statusLabels[row.original.status]}
    </span>
  ),
  meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
  enableColumnFilter: true,
}
```

Color palette (semantic, always `bg-X/10 text-X-600 dark:text-X-400`):

| Intent | Classes |
|---|---|
| Neutral / draft / borrador | `bg-gray-500/10 text-gray-600 dark:text-gray-400` |
| Success / active / completado | `bg-p3/10 text-p4 dark:text-p2` |
| Info / confirmed / en curso | `bg-sky-500/10 text-sky-600 dark:text-sky-400` |
| Progress / en preparación | `bg-amber-500/10 text-amber-600 dark:text-amber-400` |
| Warning / inactivo / pendiente | `bg-yellow-500/10 text-yellow-600 dark:text-yellow-400` |
| Danger / rechazado / cancelado | `bg-red-500/10 text-red-600 dark:text-red-400` |
| Accent / despachado | `bg-purple-500/10 text-purple-600 dark:text-purple-400` |

Each page defines its own `statusColors` / `statusLabels` record keyed by the enum. When
the status doubles as a step in a workflow (orders, shipments), include a small icon
from `lucide-react` next to the label (see `pedidos/page.tsx` — `<Icon className="size-3" />`
inside the same span, spaced with `inline-flex items-center gap-1`).

### Date columns: show date + time, and offer a range filter

Whenever a row has a date/timestamp field (`createdAt`, `issueDate`, `dueDate`,
`shippedAt`, …), render **both date and time**, not just the date:

```tsx
cell: ({ row }) => {
  const d = new Date(row.original.createdAt);
  return <span>{d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })}</span>;
}
```

For listings where filtering by a time range makes sense (orders, invoices, shipments,
movements, payments, audit events — basically anything transactional), add a **date range
filter** to that column. On the backend side:

```ts
const MODULE_COLUMNS: ColumnMap = {
  createdAt: { type: 'date', column: 'createdAt' },
};
```

`type: 'date'` wires up `<col>From` and `<col>To` query params automatically. On the
frontend, use a date-range control in the filter menu (two date inputs) and the
`buildListQuery` helper will emit `createdAtFrom=...&createdAtTo=...`.

Skip the range filter when a date column is purely informational (e.g. `lastLoginAt`
on users — usually nobody filters by it).

### Page size and pagination UI

- **Default page size is always 10.** Set it in `initialState.pagination.pageSize`. No
  20, no 50. Users can bump the size per session via the page-size selector if one is
  exposed.
- **Hide the pagination footer when `totalRows <= 10`.** If all the data fits on one
  page there are no pages to navigate and no "1–N of N" to show — the header already
  displays the count. Gate the pagination component on `totalRows > 10`:

```tsx
{totalRows > 10 && <DataTablePagination table={table} />}
```

If the pagination is rendered inside a wrapper like `ERPDataTable`, conditionally
render its internal pagination only when `totalRows > 10`.

### Single search input, not one per column
Use **one** global search box routed to the backend `q` param, which searches across a
whitelist of columns (name, sku, description, customer name, etc., whatever the service
defines in its `*_SEARCH` array). Do **not** add a text `variant: 'text'` filter per column —
users end up typing the same thing in every column.

Allowed per-column filter variants:
- **Enum / multi-select** columns (status, kind, channel, ...)
- **Numeric ranges** (price Min/Max, amount Min/Max)
- **Date ranges** (from / to)

#### SearchInput component
Use `<SearchInput>` from `@/components/search-input` for the global search box. It debounces
by 400 ms and fires immediately on Enter. Never build per-column text filters; never remap
column params to `q` manually in `fetchPage`.

```tsx
// In the page component:
const [q, setQ] = React.useState("");

// In filterParams memo — include q:
const filterParams = React.useMemo(
  () => buildListQuery({
    pagination: state.pagination,
    sorting: state.sorting,
    filters: state.columnFilters,
    q: q || undefined,
  }).toString(),
  [state.pagination, state.sorting, state.columnFilters, q],
);

// summaryParams keeps q (only strips page/limit/sort):
const summaryParams = React.useMemo(() => {
  const p = new URLSearchParams(filterParams);
  p.delete("page"); p.delete("limit"); p.delete("sort");
  return p.toString();
}, [filterParams]);

// In JSX — place SearchInput above ERPDataTable:
<SearchInput value={q} onChange={setQ} placeholder="Buscar por nombre, cliente..." />
<ERPDataTable table={table} loading={loading}>
  <ExportButton ... />
</ERPDataTable>
```

**Anti-patterns to avoid:**
- `variant: "text"` + `enableColumnFilter: true` on any column → replace with global SearchInput
- Manual remap in `fetchPage` like `params.delete("name"); params.set("q", nameVal)` → delete it
- `summaryParams` that strips `q` → summary must respect the search term

---

## Row actions: always a dropdown menu (not inline buttons)

The last column of every list table is a compact **Actions dropdown**, not a row of
inline icons and not a ChevronRight link. Inline buttons clutter the row, don't scale
beyond 2–3 actions, and force users to remember which icon does what.

Use shadcn `DropdownMenu` with a ghost `MoreHorizontal` trigger:

```tsx
import { MoreHorizontal, Eye, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

{
  id: "actions",
  header: "",
  enableSorting: false,
  enableHiding: false,
  size: 40,
  cell: ({ row }) => {
    const o = row.original;
    return (
      <div className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/pedidos/${o.id}`}>
                <Eye />
                Ver detalle
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => confirmOrder(o.id)}>
              <CheckCircle2 />
              Confirmar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditOrder(o)}>
              <Pencil />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => cancelOrder(o.id)}
            >
              <XCircle />
              Cancelar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
}
```

### Permission-gate every action

Every item in the Actions menu corresponds to a backend operation guarded by
`requirePermission(PERMISSIONS.MODULE.ACTION)` in the router. The frontend must mirror
that check: **never render a menu item the current user can't use**. Otherwise users
click, get a 403, and blame the UI.

**Source of truth** for permission codes:
`api/src/modules/permissions/permissions.constants.ts` (`orders:create`,
`orders:confirm`, `products:update`, `customers:delete`, …). Use the same string on both
sides of the wire.

**Client-side check**. The session's permissions list lives in the JWT and is available
via `getSession()` (`frontend/lib/auth.ts`) and `hasPermission(session, permission)`.
Expose it to `"use client"` tables via a context or prop from the server layout:

```tsx
// app/(app)/layout.tsx (server) — already fetches the user; forward permissions:
<PermissionsProvider permissions={session.permissions}>
  ...
</PermissionsProvider>

// frontend/hooks/use-permissions.tsx
export function usePermissions() {
  const ctx = React.useContext(PermissionsContext);
  return {
    can: (perm: string) => ctx.includes(perm),
    canAny: (...perms: string[]) => perms.some((p) => ctx.includes(p)),
  };
}

// In the page
const { can } = usePermissions();

<DropdownMenuContent align="end" className="w-48">
  <DropdownMenuItem asChild>
    <Link href={`/pedidos/${o.id}`}><Eye /> Ver detalle</Link>
  </DropdownMenuItem>
  {can("orders:confirm") && o.status === "pending_confirmation" && (
    <DropdownMenuItem onSelect={() => confirmOrder(o.id)}>
      <CheckCircle2 /> Confirmar
    </DropdownMenuItem>
  )}
  {can("orders:update") && o.status === "draft" && (
    <DropdownMenuItem onSelect={() => setEditOrder(o)}>
      <Pencil /> Editar
    </DropdownMenuItem>
  )}
  {can("orders:cancel") && (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => cancelOrder(o.id)}>
        <XCircle /> Cancelar
      </DropdownMenuItem>
    </>
  )}
</DropdownMenuContent>
```

Rules:

- **Every destructive or state-changing item is wrapped in `{can("module:action") && …}`**.
- **"Ver detalle" is always rendered** — if the user can reach the list page they have
  at least the `:view` permission.
- **Combine permission and business state**. An action needs *both* `can()` to be true
  *and* the row to be in a compatible state (e.g. only show "Confirmar" for pedidos in
  `pending_confirmation`). The dropdown must never show impossible transitions.
- **Top-of-page buttons obey the same rule**: "Nuevo Pedido" renders only when
  `can("orders:create")`. Same for "Exportar todo" if the module gates export.
- **Bulk actions** (checkbox + toolbar) respect the strictest permission of the
  selected set — if any selected row would reject, disable the bulk action entirely
  and show a tooltip explaining why.
- Don't guess permission codes. Open `permissions.constants.ts` and copy the exact
  string. If a new action introduces a new code, add it to the constants file first.

### The Actions column

- **The Actions column must always be the last column (far right)**. Declare it last
  in the `columns` array so column-visibility toggles and default rendering keep it
  pinned to the right edge. Set `size: 40`, `enableSorting: false`, `enableHiding: false`
  — it's not a data column. If the table enables user column reordering, explicitly pin
  it with `column.pinning = { right: ["actions"] }` or add `meta: { pinned: "right" }`
  so no drag operation can move it.
- **First item is always "Ver detalle"** with the `Eye` icon, linking to the detail page
  (`/<module>/[id]`). Even if other actions exist, the detail link stays first so users
  always know where to click.
- **Group actions by intent**: read → write → workflow transitions → separator → destructive.
- **Destructive items** (delete, cancel, discontinue, block) use `variant="destructive"`
  and sit AFTER a `DropdownMenuSeparator`.
- Every item includes a 16px icon from `lucide-react` (no class needed — shadcn styles it).
- Align the content `align="end"` so the menu opens flush with the row's right edge.
- Hide transitions that don't apply to the current row's state (e.g. if the order is
  already `completed`, don't render "Confirmar"). Either `return null` the item
  conditionally or wrap it in a short-circuit expression inside the content.

Remove ChevronRight links and any inline-icon clusters when migrating — they become
the Actions dropdown's menu items.

---

## Excel export — two options

With server-side pagination the client only holds the current page, so the old "export
everything in memory" approach is broken. Each server-side table exposes **two** export
actions:

1. **"Exportar esta página"** — exports the rows currently on screen (what the table has
   in `data`). Cheap, instant.
2. **"Exportar todo (filtrado)"** — hits the backend once with the same filters/sort but
   no pagination (`limit=<huge>` or dedicated `all=true`), gets every matching row, then
   writes the file. Heavier, but the user explicitly asked for it. **Must respect the
   currently applied filters** — never dump the whole table unfiltered.

Pattern:

```tsx
const exportPageRows = buildExportRows(table, mapFn);

const exportAllRows = async () => {
  // Strip pagination params; keep filters + sort.
  const params = new URLSearchParams(filterParams);
  params.set('limit', '100000'); // or however the module paginates internally
  params.delete('page');
  const all = await getXQuery(params.toString());
  return { rows: all.items.map(mapFn), meta: all.meta };
};

<ExportButton
  headers={[...]}
  {...exportPageRows}
  onExportAll={exportAllRows}
  filename="<module>"
/>
```

Labels in the dropdown: "Exportar página actual" and "Exportar todo con filtros (N rows)"
— include the filtered count so users know what they're about to download.
