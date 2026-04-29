"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Banknote,
  Building,
  CreditCard,
  DollarSign,
  Smartphone,
  Tag,
} from "lucide-react";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Payment, PaymentStatus } from "@/lib/types";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/types";
import { getPaymentsQuery, getPaymentsSummary } from "@/lib/actions/collections";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";

const paymentMethodIcon: Record<string, typeof Banknote> = {
  cash: Banknote,
  transfer: Building,
  check: CreditCard,
  card: CreditCard,
  other: Smartphone,
};

const METHOD_OPTIONS = Object.keys(PAYMENT_METHOD_LABELS).map((m) => ({
  label: PAYMENT_METHOD_LABELS[m],
  value: m,
}));

const STATUS_OPTIONS = Object.keys(PAYMENT_STATUS_LABELS).map((s) => ({
  label: PAYMENT_STATUS_LABELS[s],
  value: s,
}));

const statusColors: Record<PaymentStatus, string> = {
  draft:      "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  pending:    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  registered: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  applied:    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  reconciled: "bg-p3/10 text-p4 dark:text-p2",
  cancelled:  "bg-red-500/10 text-red-600 dark:text-red-400",
};

interface Props {
  customerId: string;
}

export function CustomerPaymentsTab({ customerId }: Props) {
  const [items, setItems] = React.useState<Payment[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const columns = React.useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.date ? formatDate(row.original.date) : "—"}
          </span>
        ),
        meta: { label: "Fecha", variant: "dateRange" },
        enableColumnFilter: true,
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
        id: "amount",
        accessorKey: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Monto" />,
        cell: ({ row }) => (
          <span className="text-right font-semibold tabular-nums text-sm block text-p3">
            +{formatMoney(Number(row.original.amount))}
          </span>
        ),
        meta: { label: "Monto", variant: "range", icon: DollarSign },
        enableColumnFilter: true,
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
    p.set("customerId", customerId);
    return p.toString();
  }, [filterParams, customerId]);

  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(filterParams);
    params.set("customerId", customerId);
    getPaymentsQuery(params.toString())
      .then((r) => {
        setItems(r.items);
        setPageCount(r.meta.totalPages);
        setTotalRows(r.meta.total);
      })
      .finally(() => setLoading(false));
  }, [filterParams, customerId]);

  React.useEffect(() => {
    getPaymentsSummary(summaryParams)
      .then((s) => setTotalAmount(s.totalAmount))
      .catch(() => setTotalAmount(0));
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (p) => [
    p.date ? new Date(p.date).toLocaleDateString("es-AR") : "—",
    PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod,
    PAYMENT_STATUS_LABELS[p.status] ?? p.status,
    p.externalReference ?? "",
    String(Number(p.amount)),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalRows} pagos · Total: {formatMoney(totalAmount)}
        </p>
      </div>
      <ERPDataTable table={table} loading={loading} skeletonColumnCount={5}>
        <ExportButton
          headers={["Fecha", "Método", "Estado", "Referencia", "Monto"]}
          {...exportRows}
          filename={`pagos-${customerId.slice(0, 8)}`}
        />
      </ERPDataTable>
    </div>
  );
}
