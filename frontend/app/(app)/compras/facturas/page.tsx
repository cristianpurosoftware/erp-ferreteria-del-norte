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
  FileText,
  Tag,
  MoreHorizontal,
  Eye,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSupplierInvoicesQuery,
  getSupplierInvoicesSummary,
  submitSupplierInvoice,
  approveSupplierInvoice,
  disputeSupplierInvoice,
  cancelSupplierInvoice,
} from "@/lib/actions/supplier-invoices";
import type { SupplierInvoice, SupplierInvoiceStatus } from "@/lib/types";
import { SUPPLIER_INVOICE_STATUS_LABELS, INVOICE_TYPE_LABELS } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(SUPPLIER_INVOICE_STATUS_LABELS) as SupplierInvoiceStatus[]).map((s) => ({
  label: SUPPLIER_INVOICE_STATUS_LABELS[s], value: s,
}));

const TYPE_OPTIONS = Object.keys(INVOICE_TYPE_LABELS).map((t) => ({
  label: INVOICE_TYPE_LABELS[t], value: t,
}));

const statusColors: Record<SupplierInvoiceStatus, string> = {
  draft:            "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  pending_approval: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  matched:          "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  approved:         "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  paid:             "bg-p3/10 text-p4 dark:text-p2",
  disputed:         "bg-red-500/10 text-red-600 dark:text-red-400",
  cancelled:        "bg-gray-500/10 text-gray-500 dark:text-gray-500",
};

export default function FacturasProveedorPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<SupplierInvoice[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);

  const columns = React.useMemo<ColumnDef<SupplierInvoice>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar número o proveedor...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "supplierInvoiceNumber",
        accessorFn: (row) => `${row.salesPoint ? `${row.salesPoint}-` : ""}${row.supplierInvoiceNumber}`,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Número" />,
        cell: ({ row }) => (
          <Link href={`/compras/facturas/${row.original.id}`} className="font-mono text-sm hover:underline">
            {row.original.salesPoint ? `${row.original.salesPoint}-` : ""}{row.original.supplierInvoiceNumber}
          </Link>
        ),
        meta: { label: "Número" },
      },
      {
        id: "supplierName",
        accessorFn: (row) => row.supplierName ?? row.supplierId,
        header: "Proveedor",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.supplierName ?? "Proveedor eliminado"}</span>
        ),
        meta: { label: "Proveedor" },
      },
      {
        id: "invoiceType",
        accessorKey: "invoiceType",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
            {INVOICE_TYPE_LABELS[row.original.invoiceType] ?? row.original.invoiceType}
          </span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: TYPE_OPTIONS },
        enableColumnFilter: true,
      },
      {
        id: "issueDate",
        accessorKey: "issueDate",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.issueDate)}</span>,
        meta: { label: "Fecha" },
      },
      {
        id: "total",
        accessorKey: "total",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Total" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm font-medium block">{formatMoney(Number(row.original.total))}</span>
        ),
        meta: { label: "Total" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {SUPPLIER_INVOICE_STATUS_LABELS[row.original.status] ?? row.original.status}
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
          const inv = row.original;
          const canView = can("supplier_invoices:view");
          const canSubmit = can("supplier_invoices:submit") && inv.status === "draft";
          const canApprove = can("supplier_invoices:approve") && (inv.status === "pending_approval" || inv.status === "matched");
          const canDispute = can("supplier_invoices:dispute") && (inv.status === "pending_approval" || inv.status === "approved" || inv.status === "matched");
          const canCancel = can("supplier_invoices:cancel") && inv.status !== "paid" && inv.status !== "cancelled";
          if (!canView && !canSubmit && !canApprove && !canDispute && !canCancel) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canView && (
                    <DropdownMenuItem asChild>
                      <Link href={`/compras/facturas/${inv.id}`}><Eye /> Ver detalle</Link>
                    </DropdownMenuItem>
                  )}
                  {canSubmit && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await submitSupplierInvoice(inv.id); toast.success("Enviada a aprobación"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Send /> Enviar a aprobación
                    </DropdownMenuItem>
                  )}
                  {canApprove && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await approveSupplierInvoice(inv.id); toast.success("Factura aprobada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle2 /> Aprobar
                    </DropdownMenuItem>
                  )}
                  {canDispute && (
                    <DropdownMenuItem onSelect={async () => {
                      const reason = prompt("Motivo del reclamo:") ?? "";
                      try { await disputeSupplierInvoice(inv.id, reason); toast.success("Factura en disputa"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <AlertTriangle /> Reclamar
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      {(canView || canSubmit || canApprove || canDispute) && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Cancelar factura?")) return;
                        try { await cancelSupplierInvoice(inv.id); toast.success("Factura cancelada"); fetchPageRef.current?.(); }
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
      sorting: [{ id: "issueDate", desc: true }],
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
    return getSupplierInvoicesQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getSupplierInvoicesSummary(summaryParams)
      .then((s) => setTotalAmount(s.totalAmount))
      .catch(() => setTotalAmount(0));
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (i) => [
    `${i.salesPoint ? `${i.salesPoint}-` : ""}${i.supplierInvoiceNumber}`,
    i.supplierName ?? "",
    INVOICE_TYPE_LABELS[i.invoiceType] ?? i.invoiceType,
    i.issueDate,
    String(i.total),
    SUPPLIER_INVOICE_STATUS_LABELS[i.status] ?? i.status,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <FileText className="size-6 text-p3" />Facturas de proveedor
            <PageHelpTooltip content={SCREEN_HELP["compras/facturas"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalRows} facturas · Total: {formatMoney(totalAmount)}
          </p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
          <ExportButton
            headers={["Número", "Proveedor", "Tipo", "Fecha", "Total", "Estado"]}
            {...exportRows}
            filename="facturas-proveedor"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
