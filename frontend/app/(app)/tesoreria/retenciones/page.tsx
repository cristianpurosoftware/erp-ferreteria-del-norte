"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { Receipt, Tag, MapPin } from "lucide-react";
import { getWithholdingsQuery, getWithholdingsSummary } from "@/lib/actions/treasury";
import type { Withholding, WithholdingKind, WithholdingDirection } from "@/lib/types";
import { WITHHOLDING_KIND_LABELS, WITHHOLDING_DIRECTION_LABELS } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const KIND_OPTIONS = (Object.keys(WITHHOLDING_KIND_LABELS) as WithholdingKind[]).map((k) => ({
  label: WITHHOLDING_KIND_LABELS[k], value: k,
}));
const DIRECTION_OPTIONS = (Object.keys(WITHHOLDING_DIRECTION_LABELS) as WithholdingDirection[]).map((d) => ({
  label: WITHHOLDING_DIRECTION_LABELS[d], value: d,
}));

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function RetencionesPage() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Withholding[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);

  const columns = React.useMemo<ColumnDef<Withholding>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar cliente o proveedor...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "kind",
        accessorKey: "kind",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400">
            {WITHHOLDING_KIND_LABELS[row.original.kind] ?? row.original.kind}
          </span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: KIND_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "direction",
        accessorKey: "direction",
        header: "Dirección",
        cell: ({ row }) => (
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            row.original.direction === "suffered"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-p3/10 text-p4 dark:text-p2",
          )}>
            {WITHHOLDING_DIRECTION_LABELS[row.original.direction] ?? row.original.direction}
          </span>
        ),
        meta: { label: "Dirección", variant: "multiSelect", options: DIRECTION_OPTIONS },
        enableColumnFilter: true,
      },
      {
        id: "jurisdictionName",
        accessorFn: (row) => row.jurisdictionName ?? "",
        header: "Jurisdicción",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.jurisdictionName ?? "—"}</span>
        ),
        meta: { label: "Jurisdicción", icon: MapPin },
      },
      {
        id: "subject",
        accessorFn: (row) => row.customerName ?? row.supplierName ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Sujeto" />,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.customerName ?? row.original.supplierName ?? "—"}</span>
        ),
        meta: { label: "Sujeto" },
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Monto" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm font-medium block">
            {formatMoney(Number(row.original.amount))}
          </span>
        ),
        meta: { label: "Monto" },
      },
      {
        id: "certificateNumber",
        accessorKey: "certificateNumber",
        header: "Certificado",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.certificateNumber ?? "—"}</span>
        ),
        meta: { label: "Certificado" },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>
        ),
        meta: { label: "Fecha" },
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
      sorting: [{ id: "createdAt", desc: true }],
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
    return getWithholdingsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getWithholdingsSummary(summaryParams)
      .then((s) => setTotalAmount(s.totalAmount))
      .catch(() => setTotalAmount(0));
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (w) => [
    WITHHOLDING_KIND_LABELS[w.kind] ?? w.kind,
    WITHHOLDING_DIRECTION_LABELS[w.direction] ?? w.direction,
    w.jurisdictionName ?? "",
    w.customerName ?? w.supplierName ?? "",
    String(w.amount),
    w.certificateNumber ?? "",
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <Receipt className="size-6 text-p3" />Retenciones
              <PageHelpTooltip content={SCREEN_HELP["tesoreria/retenciones"]} />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalRows} retenciones · Total: {formatMoney(totalAmount)}
            </p>
          </div>
          <a href="/tesoreria/retenciones/padrones" className="text-sm font-medium text-primary hover:underline">
            Importar padrón →
          </a>
        </div>
        <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
          <ExportButton
            headers={["Tipo", "Dirección", "Jurisdicción", "Sujeto", "Monto", "Certificado"]}
            {...exportRows}
            filename="retenciones"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
