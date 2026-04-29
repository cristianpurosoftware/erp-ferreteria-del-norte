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
  Plus,
  Banknote,
  Building,
  CreditCard,
  Smartphone,
  Tag,
  MoreHorizontal,
  CheckCircle2,
  Banknote as BanknoteIcon,
  GitMerge,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getCustomers } from "@/lib/actions/customers";
import {
  getPaymentsQuery,
  getPaymentsSummary,
  registerPayment,
  applyPayment,
  reconcilePayment,
  cancelPayment,
} from "@/lib/actions/collections";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Customer, Payment, PaymentStatus } from "@/lib/types";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/types";
import { PaymentForm } from "@/components/forms/payment-form";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const paymentMethodIcon: Record<string, typeof Banknote> = {
  cash: Banknote,
  transfer: Building,
  check: CreditCard,
  card: CreditCard,
  other: Smartphone,
};

const METHOD_OPTIONS = Object.keys(PAYMENT_METHOD_LABELS).map((m) => ({
  label: PAYMENT_METHOD_LABELS[m], value: m,
}));

const STATUS_OPTIONS = Object.keys(PAYMENT_STATUS_LABELS).map((s) => ({
  label: PAYMENT_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<PaymentStatus, string> = {
  draft:      "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  pending:    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  registered: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  applied:    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  reconciled: "bg-p3/10 text-p4 dark:text-p2",
  cancelled:  "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function PagosRegistradosPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Payment[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar por cliente, referencia o notas...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.date ? formatDate(row.original.date) : "—"}
          </span>
        ),
        meta: { label: "Fecha" },
      },
      {
        id: "customerName",
        accessorFn: (row) => row.customerName ?? row.customerId ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cliente" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {row.original.customerName ?? "Cliente eliminado"}
          </span>
        ),
        meta: { label: "Cliente" },
      },
      {
        id: "paymentMethod",
        accessorKey: "paymentMethod",
        header: "Método",
        cell: ({ row }) => {
          const Icon = paymentMethodIcon[row.original.paymentMethod] ?? Banknote;
          return (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Icon className="size-3" />
              {PAYMENT_METHOD_LABELS[row.original.paymentMethod] ?? row.original.paymentMethod}
            </span>
          );
        },
        meta: { label: "Método", variant: "multiSelect", options: METHOD_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Monto" />,
        cell: ({ row }) => (
          <span className="text-right font-semibold tabular-nums text-sm block">
            {formatMoney(Number(row.original.amount))}
          </span>
        ),
        meta: { label: "Monto" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {PAYMENT_STATUS_LABELS[row.original.status] ?? row.original.status}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "externalReference",
        accessorKey: "externalReference",
        header: "Referencia",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground font-mono">
            {row.original.externalReference ?? "—"}
          </span>
        ),
        meta: { label: "Referencia" },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const p = row.original;
          const canRegister = can("payments:apply") && p.status === "draft";
          const canApply = can("payments:apply") && p.status === "registered";
          const canReconcile = can("payments:reconcile") && p.status === "applied";
          const canCancel = can("payments:cancel") && p.status !== "reconciled" && p.status !== "cancelled";
          if (!canRegister && !canApply && !canReconcile && !canCancel) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canRegister && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await registerPayment(p.id); toast.success("Pago registrado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <BanknoteIcon /> Registrar
                    </DropdownMenuItem>
                  )}
                  {canApply && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await applyPayment(p.id); toast.success("Pago aplicado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle2 /> Aplicar
                    </DropdownMenuItem>
                  )}
                  {canReconcile && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await reconcilePayment(p.id); toast.success("Pago conciliado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <GitMerge /> Conciliar
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      {(canRegister || canApply || canReconcile) && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Cancelar el pago?")) return;
                        try { await cancelPayment(p.id); toast.success("Pago cancelado"); fetchPageRef.current?.(); }
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
    return getPaymentsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getPaymentsSummary(summaryParams)
      .then((s) => setTotalAmount(s.totalAmount))
      .catch(() => setTotalAmount(0));
  }, [summaryParams]);

  React.useEffect(() => {
    getCustomers({ limit: 500 }).then((c) => setCustomers(c.items)).catch(() => void 0);
  }, []);

  const exportRows = buildExportRows(table, (p) => [
    p.date ? new Date(p.date).toLocaleDateString("es-AR") : "—",
    p.customerName ?? "",
    PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod,
    String(Number(p.amount)),
    PAYMENT_STATUS_LABELS[p.status] ?? p.status,
    p.externalReference ?? "",
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <DollarSign className="size-6 text-p3" />
                Pagos registrados
                <PageHelpTooltip content={SCREEN_HELP["cobranzas/pagos-registrados"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalRows} pagos · Total: {formatMoney(totalAmount)}
              </p>
            </div>
            {can("payments:create") && (
              <Button size="sm" className="h-9 gap-1.5" onClick={() => setDrawerOpen(true)}>
                <Plus className="size-4" />
                Registrar Pago
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
            <ExportButton
              headers={["Fecha", "Cliente", "Método", "Monto", "Estado", "Referencia"]}
              {...exportRows}
              filename="pagos-registrados"
            />
          </ERPDataTable>
        </div>
      </div>

      <PaymentForm
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) fetchPageRef.current?.();
        }}
        customers={customers.map((c) => ({ id: c.id, legalName: c.legalName, commercialName: c.commercialName }))}
      />
    </>
  );
}
