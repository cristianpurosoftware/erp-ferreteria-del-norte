"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
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
import { Percent, CheckCircle, Undo2, Tag, MoreHorizontal } from "lucide-react";
import {
  getCommissionsQuery,
  getCommissionsSummary,
  approveCommission,
  reverseCommission,
} from "@/lib/actions/commissions";
import { getTeam } from "@/lib/actions/team";
import type { Commission, CommissionStatus, User } from "@/lib/types";
import { COMMISSION_STATUS_LABELS } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const statusColors: Record<CommissionStatus, string> = {
  accrued:  "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  approved: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  paid:     "bg-p3/10 text-p4 dark:text-p2",
  reversed: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const STATUS_OPTIONS = (Object.keys(COMMISSION_STATUS_LABELS) as CommissionStatus[]).map((s) => ({
  label: COMMISSION_STATUS_LABELS[s], value: s,
}));

function monthRange(month: string): { from: string; to: string } | null {
  if (!month) return null;
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const to = new Date(Date.UTC(y, m, 1)).toISOString();
  return { from, to };
}

export default function ComisionesPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Commission[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [sellers, setSellers] = React.useState<User[]>([]);
  const [month, setMonth] = React.useState<string>("");

  const sellerOptions = React.useMemo(
    () => sellers.map((s) => ({ label: `${s.first_name} ${s.last_name}`, value: s.id })),
    [sellers],
  );

  const columns = React.useMemo<ColumnDef<Commission>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar vendedor...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "sellerName",
        accessorFn: (row) => row.sellerName ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Vendedor" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.sellerName ?? "Vendedor eliminado"}</span>
        ),
        meta: { label: "Vendedor" },
      },
      {
        // Hidden column — serves only as the multiSelect filter on sellerId.
        // The visible "Vendedor" column above shows the name; this one posts
        // the selected seller UUIDs to the server without rendering them.
        id: "sellerId",
        accessorKey: "sellerId",
        header: "",
        cell: () => null,
        enableHiding: false,
        meta: { label: "Filtrar por vendedor", variant: "multiSelect", options: sellerOptions },
        enableColumnFilter: true,
      },
      {
        id: "orderNumber",
        accessorFn: (row) => row.orderNumber ?? "",
        header: "Pedido",
        cell: ({ row }) => {
          const c = row.original;
          if (!c.orderId) return <span className="text-sm">—</span>;
          if (!c.orderNumber) return <span className="text-sm text-muted-foreground">Pedido eliminado</span>;
          return <Link href={`/pedidos/${c.orderId}`} className="text-sm hover:underline">#{c.orderNumber}</Link>;
        },
        meta: { label: "Pedido" },
      },
      {
        id: "baseAmount",
        accessorKey: "baseAmount",
        header: "Base",
        cell: ({ row }) => (
          <span className="text-right text-sm tabular-nums block">{formatMoney(Number(row.original.baseAmount))}</span>
        ),
        meta: { label: "Base" },
      },
      {
        id: "rate",
        accessorKey: "rate",
        header: "Tasa",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{(Number(row.original.rate) * 100).toFixed(2)}%</span>
        ),
        meta: { label: "Tasa" },
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Monto" />,
        cell: ({ row }) => (
          <span className="text-right text-sm font-medium tabular-nums block">{formatMoney(Number(row.original.amount))}</span>
        ),
        meta: { label: "Monto" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {COMMISSION_STATUS_LABELS[row.original.status]}
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
          const canApprove = can("commissions:approve") && c.status === "accrued";
          const canReverse = can("commissions:reverse") && (c.status === "approved" || c.status === "paid");
          if (!canApprove && !canReverse) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {canApprove && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await approveCommission(c.id); toast.success("Comisión aprobada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle /> Aprobar
                    </DropdownMenuItem>
                  )}
                  {canReverse && (
                    <>
                      {canApprove && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Revertir comisión?")) return;
                        try { await reverseCommission(c.id); toast.success("Comisión revertida"); fetchPageRef.current?.(); }
                        catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                      }}>
                        <Undo2 /> Revertir
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
    [can, sellerOptions],
  );

  const { table } = useDataTable({
    data: items,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      sorting: [{ id: "amount", desc: true }],
      pagination: { pageIndex: 0, pageSize: 10 },
      columnVisibility: { q: false, sellerId: false },
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

  const buildParams = React.useCallback(() => {
    const params = new URLSearchParams(filterParams);
    const range = monthRange(month);
    if (range) { params.set("createdAtFrom", range.from); params.set("createdAtTo", range.to); }
    return params;
  }, [filterParams, month]);

  const summaryParams = React.useMemo(() => {
    const p = buildParams();
    p.delete("page"); p.delete("limit"); p.delete("sort");
    return p.toString();
  }, [buildParams]);

  const initialLoadDone = React.useRef(false);
  const fetchPageRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getCommissionsQuery(buildParams().toString())
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [buildParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getCommissionsSummary(summaryParams)
      .then((s) => setTotalAmount(s.totalAmount))
      .catch(() => setTotalAmount(0));
  }, [summaryParams]);

  React.useEffect(() => {
    getTeam({ limit: 100 }).then((t) => setSellers(t.items)).catch(() => void 0);
  }, []);

  const exportRows = buildExportRows(table, (c) => [
    c.sellerName ?? "Vendedor eliminado",
    c.orderNumber ? `#${c.orderNumber}` : "",
    String(c.baseAmount),
    String(c.rate),
    String(c.amount),
    COMMISSION_STATUS_LABELS[c.status] ?? c.status,
    c.createdAt,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <Percent className="size-6 text-p3" />
              Comisiones
              <PageHelpTooltip content={SCREEN_HELP["comercial/comisiones"]} />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalRows} comisiones · Total: {formatMoney(totalAmount)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 text-sm w-40"
              title="Filtrar por mes"
            />
            {month && (
              <button onClick={() => setMonth("")} className="text-xs text-muted-foreground hover:text-foreground underline">
                Limpiar mes
              </button>
            )}
          </div>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={8}>
          <ExportButton
            headers={["Vendedor", "Pedido", "Base", "Tasa", "Monto", "Estado", "Fecha"]}
            {...exportRows}
            filename="comisiones"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
