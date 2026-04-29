"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DollarSign, Tag } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { getAgingReport, getCustomerAccounts, type AgingReport } from "@/lib/actions/collections";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/types";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { multiSelectFilterFn } from "@/lib/data-table-filters";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

type AgingBucket = "al_dia" | "15_30" | "30_60" | "60_plus";

const AGING_LABELS: Record<AgingBucket, string> = {
  al_dia: "Al día",
  "15_30": "15-30 días",
  "30_60": "30-60 días",
  "60_plus": "+60 días",
};

const AGING_STYLES: Record<AgingBucket, { color: string; bgColor: string }> = {
  al_dia: { color: "text-green-600", bgColor: "bg-green-500/10" },
  "15_30": { color: "text-yellow-600", bgColor: "bg-yellow-500/10" },
  "30_60": { color: "text-orange-600", bgColor: "bg-orange-500/10" },
  "60_plus": { color: "text-red-600", bgColor: "bg-red-500/10" },
};

function getAgingBucketKey(account: Account): AgingBucket {
  const overdue = Number(account.overdueBalance);
  const balance = Number(account.currentBalance);
  if (balance <= 0) return "al_dia";
  if (overdue <= 0) return "al_dia";
  const ratio = overdue / balance;
  if (ratio > 0.5) return "60_plus";
  if (ratio > 0.25) return "30_60";
  return "15_30";
}

const AGING_OPTIONS = (Object.keys(AGING_LABELS) as AgingBucket[]).map((k) => ({
  label: AGING_LABELS[k],
  value: k,
}));

export default function CuentasCorrientesPage() {
  const [loading, setLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [aging, setAging] = React.useState<AgingReport[]>([]);

  React.useEffect(() => {
    Promise.all([getAgingReport(), getCustomerAccounts()])
      .then(([a, accts]) => {
        setAging(a);
        setAccounts(accts);
      })
      .finally(() => setLoading(false));
  }, []);

  const channelOptions = React.useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((a) => { if (a.channel) set.add(a.channel); });
    return Array.from(set).sort().map((c) => ({ label: c, value: c }));
  }, [accounts]);

  const columns = React.useMemo<ColumnDef<Account>[]>(
    () => [
      {
        id: "customerName",
        accessorFn: (row) => `${row.customerName ?? row.entityId} ${row.taxCondition ?? ""}`,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cliente" />,
        cell: ({ row }) => (
          <div>
            <Link href={`/clientes/${row.original.entityId}`} className="font-medium hover:underline">
              {row.original.customerName ?? "Cliente eliminado"}
            </Link>
            {row.original.taxCondition && (
              <p className="text-xs text-muted-foreground">{row.original.taxCondition}</p>
            )}
          </div>
        ),
        meta: { label: "Cliente", placeholder: "Buscar cliente o cond. fiscal...", variant: "text" },
        enableColumnFilter: true,
        filterFn: (row, _id, value) => {
          const q = String(value ?? "").toLowerCase().trim();
          if (!q) return true;
          const name = (row.original.customerName ?? "").toLowerCase();
          const tax = (row.original.taxCondition ?? "").toLowerCase();
          return name.includes(q) || tax.includes(q);
        },
      },
      {
        id: "channel",
        accessorKey: "channel",
        header: "Rubro",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground capitalize">{row.original.channel ?? "—"}</span>
        ),
        meta: { label: "Rubro", variant: "multiSelect", options: channelOptions, icon: Tag },
        enableColumnFilter: true,
        filterFn: multiSelectFilterFn,
      },
      {
        id: "agingBucket",
        accessorFn: (row) => getAgingBucketKey(row),
        header: "Estado",
        cell: ({ row }) => {
          const key = getAgingBucketKey(row.original);
          const style = AGING_STYLES[key];
          return (
            <span className={cn("text-xs px-2 py-1 rounded-full font-medium", style.bgColor, style.color)}>
              {AGING_LABELS[key]}
            </span>
          );
        },
        meta: { label: "Estado", variant: "multiSelect", options: AGING_OPTIONS, icon: Tag },
        enableColumnFilter: true,
        filterFn: multiSelectFilterFn,
      },
      {
        id: "creditLimit",
        accessorKey: "creditLimit",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Lím. crédito" />,
        cell: ({ row }) => {
          const cl = Number(row.original.creditLimit);
          return (
            <span className="text-right tabular-nums text-sm text-muted-foreground block">
              {cl > 0 ? formatMoney(cl) : "—"}
            </span>
          );
        },
        meta: { label: "Lím. crédito" },
        sortingFn: (a, b) => Number(a.original.creditLimit) - Number(b.original.creditLimit),
      },
      {
        id: "currentBalance",
        accessorKey: "currentBalance",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Deuda" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm font-medium block">
            {formatMoney(Number(row.original.currentBalance))}
          </span>
        ),
        meta: { label: "Deuda" },
        sortingFn: (a, b) => Number(a.original.currentBalance) - Number(b.original.currentBalance),
      },
      {
        id: "pctUsed",
        accessorFn: (row) => {
          const cl = Number(row.creditLimit);
          const bal = Number(row.currentBalance);
          return cl > 0 ? (bal / cl) * 100 : -1;
        },
        header: ({ column }) => <DataTableColumnHeader column={column} label="% Usado" />,
        cell: ({ row }) => {
          const cl = Number(row.original.creditLimit);
          const bal = Number(row.original.currentBalance);
          if (cl <= 0) return <span className="text-right text-sm block">—</span>;
          const pct = Math.round((bal / cl) * 100);
          return (
            <span
              className={cn(
                "text-right tabular-nums text-sm block",
                pct >= 90 ? "text-red-500 font-medium" : pct >= 70 ? "text-yellow-600" : "text-muted-foreground",
              )}
            >
              {pct}%
            </span>
          );
        },
        meta: { label: "% Usado" },
      },
    ],
    [channelOptions],
  );

  const { table } = useDataTable({
    data: accounts,
    columns,
    pageCount: -1,
    getRowId: (row) => row.id,
    manualMode: false,
    initialState: {
      sorting: [{ id: "currentBalance", desc: true }],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const totalDebt = accounts.reduce((s, a) => s + Number(a.currentBalance), 0);

  const exportRows = buildExportRows(table, (a) => {
    const cl = Number(a.creditLimit);
    const bal = Number(a.currentBalance);
    return [
      a.customerName ?? "",
      a.taxCondition ?? "",
      a.channel ?? "",
      AGING_LABELS[getAgingBucketKey(a)],
      String(cl),
      String(bal),
      cl > 0 ? `${Math.round((bal / cl) * 100)}%` : "—",
    ];
  });

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
              <DollarSign className="size-6 text-p3" />
              Cuentas corrientes
              <PageHelpTooltip content={SCREEN_HELP["cobranzas/cuentas-corrientes"]} />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Deuda total: {formatMoney(totalDebt)} · {accounts.length} clientes
            </p>
          </div>
        </div>

        {aging.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {aging.map((a) => (
              <div key={a.range} className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{a.range}</p>
                <p className="text-lg font-semibold mt-1" style={{ color: a.color }}>{formatMoney(a.amount)}</p>
                <p className="text-xs text-muted-foreground">{a.count} clientes</p>
              </div>
            ))}
          </div>
        )}

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
          <ExportButton
            headers={["Cliente", "Cond. fiscal", "Rubro", "Estado", "Lím. crédito", "Deuda", "% Usado"]}
            {...exportRows}
            filename="cuentas-corrientes"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
