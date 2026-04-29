"use client";

import * as React from "react";
import type { Table as TanstackTable } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

interface ERPDataTableProps<TData> {
  table: TanstackTable<TData>;
  loading?: boolean;
  /** How many columns to show in the skeleton while loading. Defaults to the column count of `table`. */
  skeletonColumnCount?: number;
  /** Extra elements rendered inside the toolbar (e.g. <ExportButton />). */
  children?: React.ReactNode;
}

/**
 * ERP-specific wrapper around <DataTable> that handles the loading state and
 * embeds <DataTableToolbar>. Most list pages in the ERP use this shell;
 * use <DataTable>+<DataTableToolbar> directly only when you need a layout
 * that diverges from the default.
 */
export function ERPDataTable<TData>({
  table,
  loading,
  skeletonColumnCount,
  children,
}: ERPDataTableProps<TData>) {
  if (loading) {
    const cols = skeletonColumnCount ?? table.getAllColumns().filter((c) => c.getIsVisible()).length;
    return <DataTableSkeleton columnCount={cols} rowCount={8} />;
  }
  return (
    <DataTable table={table}>
      <DataTableToolbar table={table}>{children}</DataTableToolbar>
    </DataTable>
  );
}
