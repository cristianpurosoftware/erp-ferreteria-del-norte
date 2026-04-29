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
import { Package, Plus, Tag, MoreHorizontal, Eye, Lock, Unlock } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { toast } from "sonner";
import { getLotsQuery, getLotsSummary, blockLot, unblockLot } from "@/lib/actions/lots";
import { getActiveProducts } from "@/lib/actions/products";
import { getSuppliers } from "@/lib/actions/purchases";
import { LotForm } from "@/components/forms/lot-form";
import { cn } from "@/lib/utils";
import type { Lot, Product, Supplier, LotStatus } from "@/lib/types";
import { LOT_STATUS_LABELS } from "@/lib/types";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const lotStatusColor: Record<LotStatus, string> = {
  active:   "bg-p3/10 text-p4 dark:text-p2",
  blocked:  "bg-red-500/10 text-red-600 dark:text-red-400",
  expired:  "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  consumed: "bg-gray-500/10 text-gray-500 dark:text-gray-400",
};

const LOT_STATUS_OPTIONS = (Object.keys(LOT_STATUS_LABELS) as LotStatus[]).map((s) => ({
  label: LOT_STATUS_LABELS[s], value: s,
}));

function urgencyForDays(days: number | null): { color: string; label: string } {
  if (days === null) return { color: "bg-muted text-muted-foreground", label: "Sin fecha" };
  if (days < 0) return { color: "bg-red-500/15 text-red-700", label: `Vencido hace ${Math.abs(days)}d` };
  if (days <= 7) return { color: "bg-red-500/10 text-red-600", label: `${days}d restantes` };
  if (days <= 30) return { color: "bg-orange-500/10 text-orange-600", label: `${days}d restantes` };
  return { color: "bg-p3/10 text-p3", label: `${days}d restantes` };
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default function LotesPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Lot[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [lotFormOpen, setLotFormOpen] = React.useState(false);

  const columns = React.useMemo<ColumnDef<Lot>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar lote o producto...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Lote" />,
        cell: ({ row }) => (
          <Link href={`/stock/lotes/${row.original.id}`} className="font-mono text-sm hover:underline">
            {row.original.code}
          </Link>
        ),
        meta: { label: "Lote" },
      },
      {
        id: "productName",
        accessorFn: (row) => row.productName ?? row.productId,
        header: "Producto",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.productName ?? "Producto eliminado"}</span>
        ),
        meta: { label: "Producto" },
      },
      {
        id: "expirationDate",
        accessorKey: "expirationDate",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Vencimiento" />,
        cell: ({ row }) => {
          const l = row.original;
          if (!l.expirationDate) return <span className="text-muted-foreground text-sm">—</span>;
          const days = daysUntil(l.expirationDate);
          const urgency = urgencyForDays(days);
          return (
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-sm">{l.expirationDate.slice(0, 10)}</span>
              {l.status === "active" && (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", urgency.color)}>
                  {urgency.label}
                </span>
              )}
            </div>
          );
        },
        meta: { label: "Vencimiento" },
      },
      {
        id: "supplierName",
        accessorFn: (row) => row.supplierName ?? "",
        header: "Proveedor",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.supplierName ?? "—"}</span>,
        meta: { label: "Proveedor" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", lotStatusColor[row.original.status])}>
            {LOT_STATUS_LABELS[row.original.status]}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: LOT_STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const l = row.original;
          const canView = can("lots:view");
          const canBlock = can("lots:block") && l.status === "active";
          const canUnblock = can("lots:unblock") && l.status === "blocked";
          if (!canView && !canBlock && !canUnblock) return null;
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
                      <Link href={`/stock/lotes/${l.id}`}><Eye /> Ver detalle</Link>
                    </DropdownMenuItem>
                  )}
                  {canBlock && (
                    <>
                      {canView && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        try { await blockLot(l.id); toast.success("Lote bloqueado"); fetchPageRef.current?.(); }
                        catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                      }}>
                        <Lock /> Bloquear
                      </DropdownMenuItem>
                    </>
                  )}
                  {canUnblock && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await unblockLot(l.id); toast.success("Lote desbloqueado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Unlock /> Desbloquear
                    </DropdownMenuItem>
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
      sorting: [{ id: "expirationDate", desc: false }],
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
    return getLotsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    void getLotsSummary(summaryParams).catch(() => void 0);
  }, [summaryParams]);

  React.useEffect(() => {
    Promise.all([getActiveProducts(), getSuppliers({ limit: 200 })])
      .then(([p, s]) => { setProducts(p.items); setSuppliers(s.items); })
      .catch(() => void 0);
  }, []);

  const exportRows = buildExportRows(table, (l) => [
    l.code,
    l.productName ?? "",
    l.expirationDate?.slice(0, 10) ?? "",
    l.supplierName ?? "",
    LOT_STATUS_LABELS[l.status] ?? l.status,
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <Package className="size-6 text-p3" />
                Lotes
                <PageHelpTooltip content={SCREEN_HELP["stock/lotes"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{totalRows} lotes</p>
            </div>
            {can("lots:create") && (
              <Button size="sm" className="gap-1.5" onClick={() => setLotFormOpen(true)}>
                <Plus className="size-4" />Nuevo lote
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
            <ExportButton
              headers={["Lote", "Producto", "Vencimiento", "Proveedor", "Estado"]}
              {...exportRows}
              filename="stock-lotes"
            />
          </ERPDataTable>
        </div>
      </div>

      <LotForm
        open={lotFormOpen}
        onOpenChange={(open) => {
          setLotFormOpen(open);
          if (!open) fetchPageRef.current?.();
        }}
        products={products.map((p) => ({ id: p.id, sku: p.sku, name: p.name, tracksLot: p.tracksLot }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      />
    </>
  );
}
