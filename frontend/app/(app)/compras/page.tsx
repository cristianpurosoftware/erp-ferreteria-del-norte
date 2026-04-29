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
  ShoppingBag,
  Plus,
  Truck,
  Tag,
  Building2,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  Send,
  PackageCheck,
  XCircle,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPurchaseOrdersQuery,
  getPurchaseOrdersSummary,
  getPurchaseOrderById,
  getSuppliers,
  approvePurchaseOrder,
  sendPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from "@/lib/actions/purchases";
import { getActiveProducts } from "@/lib/actions/products";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PurchaseOrder, PurchaseOrderStatus, Supplier } from "@/lib/types";
import { PurchaseForm } from "@/components/forms/purchase-form";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const statusConfig: Record<PurchaseOrderStatus, { label: string; color: string }> = {
  draft:              { label: "Borrador",          color: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  requested:          { label: "Solicitada",        color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
  approved:           { label: "Aprobada",          color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  sent:               { label: "Enviada",           color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  partially_received: { label: "Recepción parcial", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  received:           { label: "Recibida",          color: "bg-p3/10 text-p4 dark:text-p2" },
  cancelled:          { label: "Cancelada",         color: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

const STATUS_OPTIONS = (Object.keys(statusConfig) as PurchaseOrderStatus[]).map((s) => ({
  label: statusConfig[s].label,
  value: s,
}));

export default function ComprasPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<PurchaseOrder[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [products, setProducts] = React.useState<Array<{ id: string; name: string; sku?: string }>>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingPo, setEditingPo] = React.useState<PurchaseOrder | null>(null);

  const columns = React.useMemo<ColumnDef<PurchaseOrder>[]>(
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
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.date)}</span>,
        meta: { label: "Fecha" },
      },
      {
        id: "supplierName",
        accessorFn: (row) => row.supplierName ?? row.supplierId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Proveedor" />,
        cell: ({ row }) => (
          <Link href={`/compras/${row.original.id}`} className="text-sm font-medium hover:underline">
            {row.original.supplierName ?? "Proveedor eliminado"}
          </Link>
        ),
        meta: { label: "Proveedor", icon: Building2 },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
          const st = statusConfig[row.original.status];
          return (
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", st.color)}>{st.label}</span>
          );
        },
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "total",
        accessorKey: "total",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Total" />,
        cell: ({ row }) => (
          <span className="text-right text-sm font-semibold tabular-nums block">{formatMoney(row.original.total)}</span>
        ),
        meta: { label: "Total" },
      },
      {
        id: "notes",
        accessorKey: "notes",
        header: "Notas",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[150px] block">{row.original.notes ?? "—"}</span>
        ),
        meta: { label: "Notas" },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const po = row.original;
          const canView = can("purchases:view");
          const canEdit = can("purchases:update") && (po.status === "draft" || po.status === "requested");
          const canApprove = can("purchases:approve") && po.status === "requested";
          const canSend = can("purchases:send") && po.status === "approved";
          const canReceive = can("purchases:receive") && (po.status === "sent" || po.status === "partially_received");
          const canCancel = can("purchases:cancel") && po.status !== "received" && po.status !== "cancelled";
          if (!canView && !canEdit && !canApprove && !canSend && !canReceive && !canCancel) return null;
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
                      <Link href={`/compras/${po.id}`}><Eye /> Ver detalle</Link>
                    </DropdownMenuItem>
                  )}
                  {canEdit && (
                    <DropdownMenuItem onSelect={async () => {
                      try {
                        const full = await getPurchaseOrderById(po.id);
                        setEditingPo(full);
                      } catch {
                        toast.error("No se pudo cargar la orden de compra");
                      }
                    }}>
                      <Pencil /> Editar
                    </DropdownMenuItem>
                  )}
                  {canApprove && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await approvePurchaseOrder(po.id); toast.success("OC aprobada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle2 /> Aprobar
                    </DropdownMenuItem>
                  )}
                  {canSend && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await sendPurchaseOrder(po.id); toast.success("OC enviada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Send /> Enviar
                    </DropdownMenuItem>
                  )}
                  {canReceive && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await receivePurchaseOrder(po.id); toast.success("OC recibida"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <PackageCheck /> Recibir
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      {(canView || canApprove || canSend || canReceive) && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Cancelar la orden de compra?")) return;
                        try { await cancelPurchaseOrder(po.id); toast.success("OC cancelada"); fetchPageRef.current?.(); }
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
    return getPurchaseOrdersQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getPurchaseOrdersSummary(summaryParams)
      .then((s) => setTotalAmount(s.totalAmount))
      .catch(() => setTotalAmount(0));
  }, [summaryParams]);

  React.useEffect(() => {
    Promise.all([
      getSuppliers({ limit: 500 }),
      getActiveProducts(),
    ]).then(([s, p]) => {
      setSuppliers(s.items);
      setProducts(p.items.map((pr) => ({ id: pr.id, name: pr.name, sku: pr.sku ?? undefined })));
    }).catch(() => void 0);
  }, []);

  const exportRows = buildExportRows(table, (po) => [
    formatDate(po.date),
    po.supplierName ?? "",
    statusConfig[po.status]?.label ?? po.status,
    String(Number(po.total)),
    po.notes ?? "",
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <ShoppingBag className="size-6 text-p3" />
                Compras
                <PageHelpTooltip content={SCREEN_HELP.compras} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalRows} órdenes de compra · Total: {formatMoney(totalAmount)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
                <Link href="/compras/proveedores">
                  <Truck className="size-4" />
                  Proveedores
                </Link>
              </Button>
              {can("purchases:create") && (
                <Button size="sm" className="h-9 gap-1.5" onClick={() => setDrawerOpen(true)}>
                  <Plus className="size-4" />
                  Nueva OC
                </Button>
              )}
            </div>
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
            <ExportButton
              headers={["Fecha", "Proveedor", "Estado", "Total", "Notas"]}
              {...exportRows}
              filename="ordenes-compra"
            />
          </ERPDataTable>
        </div>
      </div>

      <PurchaseForm
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) fetchPageRef.current?.();
        }}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        products={products}
      />

      {editingPo && (
        <PurchaseForm
          open={!!editingPo}
          onOpenChange={(open) => {
            if (!open) { setEditingPo(null); fetchPageRef.current?.(); }
          }}
          mode="edit"
          purchaseOrderId={editingPo.id}
          initialValues={{
            supplierId: editingPo.supplierId,
            notes: editingPo.notes ?? "",
            items: editingPo.items?.map((i) => ({
              productId: i.productId,
              quantity: Number(i.quantity),
              unitCost: Number(i.unitCost),
            })) ?? [],
          }}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          products={products}
        />
      )}
    </>
  );
}
