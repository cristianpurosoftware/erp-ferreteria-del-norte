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
  AlertCircle,
  Tag,
  MoreHorizontal,
  Send,
  CheckCheck,
  Banknote,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSupplierClaimsQuery,
  sendSupplierClaim,
  acknowledgeSupplierClaim,
  creditReceivedSupplierClaim,
  resolveSupplierClaim,
  rejectSupplierClaim,
} from "@/lib/actions/supplier-claims";
import type { SupplierClaim, SupplierClaimStatus, SupplierClaimKind } from "@/lib/types";
import { SUPPLIER_CLAIM_KIND_LABELS, SUPPLIER_CLAIM_STATUS_LABELS } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(SUPPLIER_CLAIM_STATUS_LABELS) as SupplierClaimStatus[]).map((s) => ({
  label: SUPPLIER_CLAIM_STATUS_LABELS[s], value: s,
}));
const KIND_OPTIONS = (Object.keys(SUPPLIER_CLAIM_KIND_LABELS) as SupplierClaimKind[]).map((k) => ({
  label: SUPPLIER_CLAIM_KIND_LABELS[k], value: k,
}));

const statusColors: Record<SupplierClaimStatus, string> = {
  draft:           "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  sent:            "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  acknowledged:    "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  credit_received: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  resolved:        "bg-p3/10 text-p4 dark:text-p2",
  rejected:        "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function ReclamosProveedorPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<SupplierClaim[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);

  const columns = React.useMemo<ColumnDef<SupplierClaim>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar proveedor...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "supplierName",
        accessorFn: (row) => row.supplierName ?? row.supplierId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Proveedor" />,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.supplierName ?? "Proveedor eliminado"}</span>
        ),
        meta: { label: "Proveedor" },
      },
      {
        id: "kind",
        accessorKey: "kind",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{SUPPLIER_CLAIM_KIND_LABELS[row.original.kind]}</span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: KIND_OPTIONS },
        enableColumnFilter: true,
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Monto" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm block">
            {row.original.amount ? formatMoney(Number(row.original.amount)) : "—"}
          </span>
        ),
        meta: { label: "Monto" },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Creado" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
        meta: { label: "Creado" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {SUPPLIER_CLAIM_STATUS_LABELS[row.original.status] ?? row.original.status}
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
          const c = row.original;
          const canSend = can("supplier_claims:send") && c.status === "draft";
          const canAck = can("supplier_claims:resolve") && c.status === "sent";
          const canCredit = can("supplier_claims:resolve") && c.status === "acknowledged";
          const canResolve = can("supplier_claims:resolve") && (c.status === "acknowledged" || c.status === "credit_received");
          const canReject = can("supplier_claims:reject") && c.status !== "resolved" && c.status !== "rejected";
          if (!canSend && !canAck && !canCredit && !canResolve && !canReject) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canSend && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await sendSupplierClaim(c.id); toast.success("Reclamo enviado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Send /> Enviar
                    </DropdownMenuItem>
                  )}
                  {canAck && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await acknowledgeSupplierClaim(c.id); toast.success("Reconocido"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCheck /> Reconocer
                    </DropdownMenuItem>
                  )}
                  {canCredit && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await creditReceivedSupplierClaim(c.id); toast.success("Crédito recibido"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Banknote /> Crédito recibido
                    </DropdownMenuItem>
                  )}
                  {canResolve && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await resolveSupplierClaim(c.id); toast.success("Resuelto"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle2 /> Resolver
                    </DropdownMenuItem>
                  )}
                  {canReject && (
                    <>
                      {(canSend || canAck || canCredit || canResolve) && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Rechazar reclamo?")) return;
                        try { await rejectSupplierClaim(c.id); toast.success("Reclamo rechazado"); fetchPageRef.current?.(); }
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
    return getSupplierClaimsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  const exportRows = buildExportRows(table, (c) => [
    c.supplierName ?? "",
    SUPPLIER_CLAIM_KIND_LABELS[c.kind] ?? c.kind,
    c.amount ? String(c.amount) : "",
    c.createdAt,
    SUPPLIER_CLAIM_STATUS_LABELS[c.status] ?? c.status,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <AlertCircle className="size-6 text-p3" />Reclamos a proveedores
            <PageHelpTooltip content={SCREEN_HELP["compras/reclamos"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalRows} reclamos</p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
          <ExportButton
            headers={["Proveedor", "Tipo", "Monto", "Creado", "Estado"]}
            {...exportRows}
            filename="reclamos-proveedor"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
