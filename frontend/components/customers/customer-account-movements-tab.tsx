"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DollarSign, Tag } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccountEntry, AccountEntryStatus } from "@/lib/types";
import {
  getAccountEntriesQuery,
  getAccountEntriesSummary,
} from "@/lib/actions/customers";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";

const ENTRY_TYPE_LABELS: Record<string, string> = {
  debit: "Débito",
  credit: "Crédito",
};

const ENTRY_STATUS_LABELS: Record<AccountEntryStatus, string> = {
  pending: "Pendiente",
  partially_settled: "Parcial",
  settled: "Saldado",
  overdue: "Vencido",
};

const TYPE_OPTIONS = Object.keys(ENTRY_TYPE_LABELS).map((k) => ({
  label: ENTRY_TYPE_LABELS[k],
  value: k,
}));

const STATUS_OPTIONS = (Object.keys(ENTRY_STATUS_LABELS) as AccountEntryStatus[]).map((k) => ({
  label: ENTRY_STATUS_LABELS[k],
  value: k,
}));

const statusColors: Record<AccountEntryStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  partially_settled: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  settled: "bg-p3/10 text-p4 dark:text-p2",
  overdue: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const typeColors: Record<string, string> = {
  debit: "text-foreground",
  credit: "text-p3",
};

interface Props {
  accountId: string;
}

export function CustomerAccountMovementsTab({ accountId }: Props) {
  const [items, setItems] = React.useState<AccountEntry[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [debitAmount, setDebitAmount] = React.useState(0);
  const [creditAmount, setCreditAmount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const columns = React.useMemo<ColumnDef<AccountEntry>[]>(
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
        id: "type",
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {ENTRY_TYPE_LABELS[row.original.type] ?? row.original.type}
          </span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: TYPE_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "concept",
        accessorKey: "concept",
        header: "Concepto",
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.concept}</span>
        ),
        meta: { label: "Concepto" },
      },
      {
        id: "referenceType",
        accessorKey: "referenceType",
        header: "Referencia",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-mono">
            {row.original.referenceType ?? "—"}
            {row.original.referenceId ? ` · ${row.original.referenceId.slice(0, 8)}` : ""}
          </span>
        ),
        meta: { label: "Referencia" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {ENTRY_STATUS_LABELS[row.original.status] ?? row.original.status}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Monto" />,
        cell: ({ row }) => {
          const sign = row.original.type === "credit" ? "-" : "+";
          return (
            <span className={cn("text-right font-semibold tabular-nums text-sm block", typeColors[row.original.type])}>
              {sign}{formatMoney(Number(row.original.amount))}
            </span>
          );
        },
        meta: { label: "Monto", variant: "range", icon: DollarSign },
        enableColumnFilter: true,
      },
      {
        id: "resultingBalance",
        accessorKey: "resultingBalance",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Saldo" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm text-muted-foreground block">
            {formatMoney(Number(row.original.resultingBalance))}
          </span>
        ),
        meta: { label: "Saldo" },
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
    return p.toString();
  }, [filterParams]);

  React.useEffect(() => {
    setLoading(true);
    getAccountEntriesQuery(accountId, filterParams)
      .then((r) => {
        setItems(r.items);
        setPageCount(r.meta.totalPages);
        setTotalRows(r.meta.total);
      })
      .finally(() => setLoading(false));
  }, [filterParams, accountId]);

  React.useEffect(() => {
    getAccountEntriesSummary(accountId, summaryParams)
      .then((s) => {
        setDebitAmount(s.debitAmount);
        setCreditAmount(s.creditAmount);
      })
      .catch(() => {
        setDebitAmount(0);
        setCreditAmount(0);
      });
  }, [summaryParams, accountId]);

  const exportRows = buildExportRows(table, (e) => [
    e.date ? new Date(e.date).toLocaleDateString("es-AR") : "—",
    ENTRY_TYPE_LABELS[e.type] ?? e.type,
    e.concept,
    e.referenceType ?? "",
    ENTRY_STATUS_LABELS[e.status] ?? e.status,
    String(Number(e.amount)),
    String(Number(e.resultingBalance)),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {totalRows} movimientos · Débitos: {formatMoney(debitAmount)} · Créditos: {formatMoney(creditAmount)}
        </p>
      </div>
      <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
        <ExportButton
          headers={["Fecha", "Tipo", "Concepto", "Referencia", "Estado", "Monto", "Saldo"]}
          {...exportRows}
          filename={`movimientos-${accountId.slice(0, 8)}`}
        />
      </ERPDataTable>
    </div>
  );
}
