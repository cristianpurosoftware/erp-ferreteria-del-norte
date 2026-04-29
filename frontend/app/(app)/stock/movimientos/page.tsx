"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Send, ArrowDown, ArrowUp, RefreshCw, Tag } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { getStockMovementsQuery, getStockMovementsSummary } from "@/lib/actions/inventory";
import { cn } from "@/lib/utils";
import type { StockMovement } from "@/lib/types";
import { MOVEMENT_TYPE_LABELS } from "@/lib/types";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const movementTypeConfig: Record<string, { icon: typeof ArrowUp; color: string }> = {
  inbound:    { icon: ArrowDown, color: "bg-p3/10 text-p4 dark:text-p2" },
  entry:      { icon: ArrowDown, color: "bg-p3/10 text-p4 dark:text-p2" },
  outbound:   { icon: ArrowUp,   color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  exit:       { icon: ArrowUp,   color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  adjustment: { icon: RefreshCw, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  transfer:   { icon: RefreshCw, color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  reservation:{ icon: Send,      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  release:    { icon: Send,      color: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  return:     { icon: ArrowDown, color: "bg-p3/10 text-p4 dark:text-p2" },
};

const MOVEMENT_TYPE_OPTIONS = Object.keys(movementTypeConfig).map((k) => ({
  label: MOVEMENT_TYPE_LABELS[k] ?? k,
  value: k,
}));

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function MovimientosPage() {
  const [loading, setLoading] = React.useState(true);
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [summary, setSummary] = React.useState({ inbound: 0, outbound: 0 });

  const columns = React.useMemo<ColumnDef<StockMovement>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar producto, SKU o motivo...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => {
          const config = movementTypeConfig[row.original.type] ?? { icon: RefreshCw, color: "bg-gray-500/10 text-gray-600" };
          const Icon = config.icon;
          return (
            <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", config.color)}>
              <Icon className="size-3" />
              {MOVEMENT_TYPE_LABELS[row.original.type] ?? row.original.type}
            </span>
          );
        },
        meta: { label: "Tipo", variant: "multiSelect", options: MOVEMENT_TYPE_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "productName",
        accessorFn: (row) => row.productName ?? row.productId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Producto" />,
        cell: ({ row }) => <span className="text-sm">{row.original.productName ?? "Producto eliminado"}</span>,
        meta: { label: "Producto" },
      },
      {
        id: "lotCode",
        accessorFn: (row) => row.lotCode ?? "",
        header: "Lote",
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">
            {row.original.lotCode ?? "—"}
          </span>
        ),
        meta: { label: "Lote" },
      },
      {
        id: "quantity",
        accessorKey: "quantity",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cantidad" />,
        cell: ({ row }) => <span className="text-right tabular-nums text-sm font-medium block">{row.original.quantity}</span>,
        meta: { label: "Cantidad" },
      },
      {
        id: "reason",
        accessorFn: (row) => row.reasonCode ?? row.reason ?? "",
        header: "Motivo",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.reasonCode ?? row.original.reason ?? "—"}
          </span>
        ),
        meta: { label: "Motivo" },
      },
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.original.date)}</span>,
        meta: { label: "Fecha" },
      },
    ],
    [],
  );

  const { table } = useDataTable({
    data: movements,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false },
      sorting: [{ id: "date", desc: true }],
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
  const summaryParams = React.useMemo(() => {
    const p = new URLSearchParams(filterParams);
    p.delete("page"); p.delete("limit"); p.delete("sort");
    return p.toString();
  }, [filterParams]);

  const initialLoadDone = React.useRef(false);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getStockMovementsQuery(filterParams)
      .then((r) => {
        setMovements(r.items);
        setPageCount(r.meta.totalPages);
        setTotalRows(r.meta.total);
      })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getStockMovementsSummary(summaryParams)
      .then((s) => setSummary({ inbound: s.inbound, outbound: s.outbound }))
      .catch(() => setSummary({ inbound: 0, outbound: 0 }));
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (m) => [
    MOVEMENT_TYPE_LABELS[m.type] ?? m.type,
    m.productName ?? "",
    m.lotCode ?? "",
    String(m.quantity),
    m.reasonCode ?? m.reason ?? "",
    formatDateTime(m.date),
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <Send className="size-6 text-p3" />
            Movimientos
            <PageHelpTooltip content={SCREEN_HELP["stock/movimientos"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalRows} movimientos · Ingresos: {summary.inbound} · Egresos: {summary.outbound}
          </p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
          <ExportButton
            headers={["Tipo", "Producto", "Lote", "Cantidad", "Motivo", "Fecha"]}
            {...exportRows}
            filename="stock-movimientos"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
