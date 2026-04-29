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
  DollarSign,
  Building2,
  Calendar,
  Tag,
  MoreHorizontal,
  CheckCircle2,
  Banknote,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPaymentOrdersQuery,
  getPaymentOrdersSummary,
  approvePaymentOrder,
  payPaymentOrder,
  cancelPaymentOrder,
} from "@/lib/actions/treasury";
import type { PaymentOrder, PaymentOrderStatus } from "@/lib/types";
import { PAYMENT_ORDER_STATUS_LABELS } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(PAYMENT_ORDER_STATUS_LABELS) as PaymentOrderStatus[]).map((s) => ({
  label: PAYMENT_ORDER_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<PaymentOrderStatus, string> = {
  draft:     "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  approved:  "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  paid:      "bg-p3/10 text-p4 dark:text-p2",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function OrdenesPagoPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<PaymentOrder[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);

  const columns = React.useMemo<ColumnDef<PaymentOrder>[]>(
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
          <span className="text-sm font-medium">
            {row.original.supplierName ?? "Proveedor eliminado"}
          </span>
        ),
        meta: { label: "Proveedor", icon: Building2 },
      },
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.date)}</span>,
        meta: { label: "Fecha", icon: Calendar },
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
            {PAYMENT_ORDER_STATUS_LABELS[row.original.status] ?? row.original.status}
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
          const o = row.original;
          const canApprove = can("payment_orders:approve") && o.status === "draft";
          const canPay = can("payment_orders:pay") && o.status === "approved";
          const canCancel = can("payment_orders:cancel") && o.status !== "paid" && o.status !== "cancelled";
          if (!canApprove && !canPay && !canCancel) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canApprove && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await approvePaymentOrder(o.id); toast.success("Orden aprobada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle2 /> Aprobar
                    </DropdownMenuItem>
                  )}
                  {canPay && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await payPaymentOrder(o.id); toast.success("Orden pagada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Banknote /> Pagar
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      {(canApprove || canPay) && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Cancelar orden de pago?")) return;
                        try { await cancelPaymentOrder(o.id); toast.success("Orden cancelada"); fetchPageRef.current?.(); }
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
    return getPaymentOrdersQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getPaymentOrdersSummary(summaryParams)
      .then((s) => setTotalAmount(s.totalAmount))
      .catch(() => setTotalAmount(0));
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (o) => [
    o.supplierName ?? "Proveedor eliminado",
    o.date,
    String(o.total),
    PAYMENT_ORDER_STATUS_LABELS[o.status] ?? o.status,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <DollarSign className="size-6 text-p3" />Órdenes de pago
              <PageHelpTooltip content={SCREEN_HELP["tesoreria/ordenes-pago"]} />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalRows} órdenes · Total: {formatMoney(totalAmount)}
            </p>
          </div>
        </div>
        <ERPDataTable table={table} loading={loading} skeletonColumnCount={5}>
          <ExportButton
            headers={["Proveedor", "Fecha", "Total", "Estado"]}
            {...exportRows}
            filename="ordenes-pago"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
