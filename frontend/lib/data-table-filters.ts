import type { FilterFn, Row } from "@tanstack/react-table";

/**
 * filterFn for columns with `meta.variant: "multiSelect"`.
 * Returns true when no values are selected (pass-through) or when the row's
 * value for that column matches one of the selected values.
 *
 * Works with string | null | undefined column values.
 *
 * Declared as a generic `FilterFn<TData>` so TanStack accepts it in any
 * ColumnDef without variance issues.
 */
export function multiSelectFilterFn<TData>(
  row: Row<TData>,
  columnId: string,
  value: unknown,
): boolean {
  const selected = value as string[] | undefined;
  if (!selected || selected.length === 0) return true;
  const v = row.getValue(columnId) as string | null | undefined;
  return v !== null && v !== undefined && selected.includes(v);
}

// Satisfy the exported type so TS accepts it as a FilterFn<TData>.
multiSelectFilterFn.autoRemove = (value: unknown) =>
  !Array.isArray(value) || value.length === 0;

// Re-export a typed handle for clarity when importing.
export type { FilterFn };
