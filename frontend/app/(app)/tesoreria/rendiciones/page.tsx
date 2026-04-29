"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import {
  FileCheck,
  Tag,
  MoreHorizontal,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRenditionsQuery,
  getRenditionsSummary,
  submitRendition,
  approveRendition,
  rejectRendition,
} from "@/lib/actions/treasury";
import type { CollectorRendition, RenditionStatus } from "@/lib/types";
import { RENDITION_STATUS_LABELS } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(RENDITION_STATUS_LABELS) as RenditionStatus[]).map((s) => ({
  label: RENDITION_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<RenditionStatus, string> = {
  draft:     "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  submitted: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved:  "bg-p3/10 text-p4 dark:text-p2",
  rejected:  "bg-red-500/10 text-red-600 dark:text-red-400",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function RendicionesPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<CollectorRendition[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);

  const columns = React.useMemo<ColumnDef<CollectorRendition>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar cobrador...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "collectorName",
        accessorFn: (row) => row.collectorName ?? row.collectorId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cobrador" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.collectorName ?? "Cobrador no disponible"}</span>
        ),
        meta: { label: "Cobrador" },
      },
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.date)}</span>,
        meta: { label: "Fecha" },
      },
      {
        id: "totalCash",
        accessorKey: "totalCash",
        header: "Efectivo",
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm block">{formatMoney(Number(row.original.totalCash))}</span>
        ),
        meta: { label: "Efectivo" },
      },
      {
        id: "totalChecks",
        accessorKey: "totalChecks",
        header: "Cheques",
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm block">{formatMoney(Number(row.original.totalChecks))}</span>
        ),
        meta: { label: "Cheques" },
      },
      {
        id: "total",
        accessorKey: "total",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Total" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm font-medium block">
            {formatMoney(Number(row.original.total))}
          </span>
        ),
        meta: { label: "Total" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {RENDITION_STATUS_LABELS[row.original.status]}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const r = row.original;
          const canSubmit = can("renditions:submit") && r.status === "draft";
          const canApprove = can("renditions:approve") && r.status === "submitted";
          const canReject = can("renditions:reject") && r.status === "submitted";
          if (!canSubmit && !canApprove && !canReject) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canSubmit && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await submitRendition(r.id); toast.success("Rendición enviada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Send /> Enviar
                    </DropdownMenuItem>
                  )}
                  {canApprove && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await approveRendition(r.id); toast.success("Rendición aprobada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle2 /> Aprobar
                    </DropdownMenuItem>
                  )}
                  {canReject && (
                    <>
                      {(canSubmit || canApprove) && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        const reason = prompt("Motivo del rechazo:") ?? "Rechazada";
                        try { await rejectRendition(r.id, reason); toast.success("Rendición rechazada"); fetchPageRef.current?.(); }
                        catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                      }}>
                        <XCircle /> Rechazar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [can],
  );

  const { table } = useDataTable({
    data: items,
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
  const fetchPageRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getRenditionsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    void getRenditionsSummary(summaryParams).catch(() => void 0);
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (x) => [
    x.collectorName ?? "",
    x.date,
    String(x.totalCash),
    String(x.totalChecks),
    String(x.total),
    RENDITION_STATUS_LABELS[x.status] ?? x.status,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <FileCheck className="size-6 text-p3" />Rendiciones de cobradores
            <PageHelpTooltip content={SCREEN_HELP["tesoreria/rendiciones"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalRows} rendiciones</p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
          <ExportButton
            headers={["Cobrador", "Fecha", "Efectivo", "Cheques", "Total", "Estado"]}
            {...exportRows}
            filename="rendiciones"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
