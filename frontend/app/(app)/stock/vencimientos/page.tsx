"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Receipt, AlertTriangle, Clock } from "lucide-react";
import { getLotsQuery } from "@/lib/actions/lots";
import { cn } from "@/lib/utils";
import type { Lot } from "@/lib/types";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

function urgencyForDays(days: number | null): { color: string; label: string } {
  if (days === null) return { color: "bg-muted text-muted-foreground", label: "Sin fecha" };
  if (days < 0) return { color: "bg-red-500/15 text-red-700", label: `Vencido hace ${Math.abs(days)}d` };
  if (days <= 7) return { color: "bg-red-500/10 text-red-600", label: `${days}d restantes` };
  if (days <= 30) return { color: "bg-orange-500/10 text-orange-600", label: `${days}d restantes` };
  return { color: "bg-p3/10 text-p3", label: `${days}d restantes` };
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default function VencimientosPage() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Lot[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);

  const dateRange = React.useMemo(() => {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from); to.setDate(to.getDate() + 30);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const columns = React.useMemo<ColumnDef<Lot>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar lote o producto...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Lote" />,
        cell: ({ row }) => (
          <Link href={`/stock/lotes/${row.original.id}`} className="font-mono text-sm hover:underline">
            {row.original.code}
          </Link>
        ),
        meta: { label: "Lote" },
      },
      {
        id: "productName",
        accessorFn: (row) => row.productName ?? row.productId,
        header: "Producto",
        cell: ({ row }) => <span className="text-sm">{row.original.productName ?? "Producto eliminado"}</span>,
        meta: { label: "Producto" },
      },
      {
        id: "expirationDate",
        accessorKey: "expirationDate",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Vence" />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.expirationDate?.slice(0, 10) ?? "—"}</span>,
        meta: { label: "Vence" },
      },
      {
        id: "urgency",
        accessorFn: (row) => daysUntil(row.expirationDate) ?? 9999,
        header: "Urgencia",
        enableSorting: false,
        cell: ({ row }) => {
          const days = daysUntil(row.original.expirationDate);
          const urgency = urgencyForDays(days);
          return (
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1", urgency.color)}>
              <AlertTriangle className="size-3" />
              {urgency.label}
            </span>
          );
        },
        meta: { label: "Urgencia" },
      },
    ],
    [],
  );

  const { table } = useDataTable({
    data: items,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false },
      sorting: [{ id: "expirationDate", desc: false }],
      pagination: { pageIndex: 0, pageSize: 10 },
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

  const initialLoadDone = React.useRef(false);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    const params = new URLSearchParams(filterParams);
    params.set("status", "active");
    params.set("expirationDateFrom", dateRange.from);
    params.set("expirationDateTo", dateRange.to);
    return getLotsQuery(params.toString())
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams, dateRange]);

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <Receipt className="size-6 text-p3" />
            Vencimientos
            <PageHelpTooltip content={SCREEN_HELP["stock/vencimientos"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            <Clock className="size-3.5" />
            {totalRows} lotes activos con vencimiento en los próximos 30 días.
          </p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={4} />
      </div>
    </div>
  );
}
