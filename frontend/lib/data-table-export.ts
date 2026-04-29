import type { Table } from "@tanstack/react-table";

/**
 * Builds `{ pageRows, allRows }` for <ExportButton/> from a TanStack table in
 * client-side pagination mode. `pageRows` = current page, `allRows` = every
 * row that matches the active filters (across all pages).
 *
 * For server-side pagination, don't use this — pass `pageRows` from the
 * current response and supply `fetchAllRows` that refetches with limit=total.
 */
export function buildExportRows<TData>(
  table: Table<TData>,
  rowFn: (row: TData) => string[],
): { pageRows: string[][]; allRows: string[][] } {
  const pageRows = table.getRowModel().rows.map((r) => rowFn(r.original));
  const allRows = table.getFilteredRowModel().rows.map((r) => rowFn(r.original));
  return { pageRows, allRows };
}
