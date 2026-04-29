"use client";

import * as React from "react";
import Link from "next/link";
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
  Package,
  Tag,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  PackageCheck,
  Lock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getReturnsQuery,
  confirmReturn,
  receiveReturn,
  closeReturn,
  cancelReturn,
} from "@/lib/actions/returns";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReturnOrder, ReturnStatus, ReturnKind } from "@/lib/types";
import { RETURN_STATUS_LABELS, RETURN_KIND_LABELS } from "@/lib/types";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(RETURN_STATUS_LABELS) as ReturnStatus[]).map((s) => ({
  label: RETURN_STATUS_LABELS[s], value: s,
}));
const KIND_OPTIONS = (Object.keys(RETURN_KIND_LABELS) as ReturnKind[]).map((k) => ({
  label: RETURN_KIND_LABELS[k], value: k,
}));

const statusColors: Record<ReturnStatus, string> = {
  draft:      "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  confirmed:  "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  received:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  inspected:  "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  closed:     "bg-p3/10 text-p4 dark:text-p2",
  cancelled:  "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function DevolucionesPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<ReturnOrder[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);

  const columns = React.useMemo<ColumnDef<ReturnOrder>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar cliente...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "customerName",
        accessorFn: (row) => row.customerName ?? row.customerId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cliente" />,
        cell: ({ row }) => (
          <Link href={`/logistica/devoluciones/${row.original.id}`} className="text-sm hover:underline">
            {row.original.customerName ?? "Cliente eliminado"}
          </Link>
        ),
        meta: { label: "Cliente" },
      },
      {
        id: "kind",
        accessorKey: "kind",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{RETURN_KIND_LABELS[row.original.kind] ?? row.original.kind}</span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: KIND_OPTIONS },
        enableColumnFilter: true,
      },
      {
        id: "originalOrderNumber",
        accessorFn: (row) => row.originalOrderNumber ?? "",
        header: "Pedido original",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.originalOrderNumber
              ? `#${row.original.originalOrderNumber}`
              : row.original.originalOrderId
                ? "Pedido eliminado"
                : "—"}
          </span>
        ),
        meta: { label: "Pedido original" },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Creada" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
        meta: { label: "Creada" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {RETURN_STATUS_LABELS[row.original.status]}
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
          const canView = can("returns:view");
          const canConfirm = can("returns:confirm") && r.status === "draft";
          const canReceive = can("returns:receive") && r.status === "confirmed";
          const canClose = can("returns:close") && r.status === "inspected";
          const canCancel = can("returns:cancel") && r.status !== "closed" && r.status !== "cancelled";
          if (!canView && !canConfirm && !canReceive && !canClose && !canCancel) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canView && (
                    <DropdownMenuItem asChild>
                      <Link href={`/logistica/devoluciones/${r.id}`}><Eye /> Ver detalle</Link>
                    </DropdownMenuItem>
                  )}
                  {canConfirm && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await confirmReturn(r.id); toast.success("Devolución confirmada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle2 /> Confirmar
                    </DropdownMenuItem>
                  )}
                  {canReceive && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await receiveReturn(r.id); toast.success("Devolución recibida"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <PackageCheck /> Recibir
                    </DropdownMenuItem>
                  )}
                  {canClose && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await closeReturn(r.id); toast.success("Devolución cerrada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Lock /> Cerrar
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      {(canView || canConfirm || canReceive || canClose) && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Cancelar devolución?")) return;
                        try { await cancelReturn(r.id); toast.success("Devolución cancelada"); fetchPageRef.current?.(); }
                        catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                      }}>
                        <XCircle /> Cancelar
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

  const initialLoadDone = React.useRef(false);
  const fetchPageRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getReturnsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  const exportRows = buildExportRows(table, (x) => [
    x.customerName ?? "Cliente eliminado",
    RETURN_KIND_LABELS[x.kind] ?? x.kind,
    x.originalOrderNumber ? `#${x.originalOrderNumber}` : "",
    RETURN_STATUS_LABELS[x.status] ?? x.status,
    x.createdAt,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <Package className="size-6 text-p3" />Devoluciones
            <PageHelpTooltip content={SCREEN_HELP["logistica/devoluciones"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalRows} devoluciones</p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
          <ExportButton
            headers={["Cliente", "Tipo", "Pedido", "Estado", "Creada"]}
            {...exportRows}
            filename="devoluciones"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
