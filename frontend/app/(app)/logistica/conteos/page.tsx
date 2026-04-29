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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import {
  Warehouse as WarehouseIcon,
  Plus,
  Loader2,
  Tag,
  MoreHorizontal,
  Eye,
  Play,
  CheckCircle2,
  ArrowDown,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getInventoryCountsQuery,
  createInventoryCount,
  startInventoryCount,
  approveInventoryCount,
  applyInventoryCount,
  cancelInventoryCount,
} from "@/lib/actions/inventory-counts";
import { getWarehouses } from "@/lib/actions/settings";
import type { InventoryCount, InventoryCountStatus, InventoryCountKind, Warehouse } from "@/lib/types";
import { INVENTORY_COUNT_STATUS_LABELS, INVENTORY_COUNT_KIND_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(INVENTORY_COUNT_STATUS_LABELS) as InventoryCountStatus[]).map((s) => ({
  label: INVENTORY_COUNT_STATUS_LABELS[s], value: s,
}));
const KIND_OPTIONS = (Object.keys(INVENTORY_COUNT_KIND_LABELS) as InventoryCountKind[]).map((k) => ({
  label: INVENTORY_COUNT_KIND_LABELS[k], value: k,
}));

const statusColors: Record<InventoryCountStatus, string> = {
  draft:            "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  in_progress:      "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  pending_approval: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  approved:         "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  applied:          "bg-p3/10 text-p4 dark:text-p2",
  cancelled:        "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function ConteosPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<InventoryCount[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [dialog, setDialog] = React.useState(false);
  const [acting, setActing] = React.useState(false);
  const [form, setForm] = React.useState({ warehouseId: "", kind: "cycle" as InventoryCountKind, notes: "" });

  const columns = React.useMemo<ColumnDef<InventoryCount>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar depósito...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "warehouseName",
        accessorFn: (row) => row.warehouseName ?? row.warehouseId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Depósito" />,
        cell: ({ row }) => (
          <Link href={`/logistica/conteos/${row.original.id}`} className="text-sm hover:underline">
            {row.original.warehouseName ?? "—"}
          </Link>
        ),
        meta: { label: "Depósito" },
      },
      {
        id: "kind",
        accessorKey: "kind",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{INVENTORY_COUNT_KIND_LABELS[row.original.kind]}</span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: KIND_OPTIONS },
        enableColumnFilter: true,
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
            {INVENTORY_COUNT_STATUS_LABELS[row.original.status]}
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
          const canView = can("inventory_counts:view");
          const canStart = can("inventory_counts:start") && c.status === "draft";
          const canApprove = can("inventory_counts:approve") && c.status === "pending_approval";
          const canApply = can("inventory_counts:apply") && c.status === "approved";
          const canCancel = can("inventory_counts:cancel") && c.status !== "applied" && c.status !== "cancelled";
          if (!canView && !canStart && !canApprove && !canApply && !canCancel) return null;
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
                      <Link href={`/logistica/conteos/${c.id}`}><Eye /> Ver detalle</Link>
                    </DropdownMenuItem>
                  )}
                  {canStart && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await startInventoryCount(c.id); toast.success("Conteo iniciado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Play /> Iniciar
                    </DropdownMenuItem>
                  )}
                  {canApprove && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await approveInventoryCount(c.id); toast.success("Conteo aprobado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle2 /> Aprobar
                    </DropdownMenuItem>
                  )}
                  {canApply && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await applyInventoryCount(c.id); toast.success("Conteo aplicado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <ArrowDown /> Aplicar
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      {(canView || canStart || canApprove || canApply) && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Cancelar conteo?")) return;
                        try { await cancelInventoryCount(c.id); toast.success("Conteo cancelado"); fetchPageRef.current?.(); }
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
    return getInventoryCountsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getWarehouses().then((w) => setWarehouses(w.items)).catch(() => void 0);
  }, []);

  const create = async () => {
    if (!form.warehouseId) return;
    setActing(true);
    try {
      const created = await createInventoryCount({
        warehouseId: form.warehouseId,
        kind: form.kind,
        notes: form.notes || undefined,
      });
      toast.success("Conteo creado", {
        description: `${created.warehouseName ?? "Depósito"} · ${INVENTORY_COUNT_KIND_LABELS[created.kind] ?? created.kind}`,
      });
      setDialog(false);
      setForm({ warehouseId: "", kind: "cycle", notes: "" });
      fetchPageRef.current?.();
    } catch (err) { toast.error("Error", { description: err instanceof Error ? err.message : "" }); }
    finally { setActing(false); }
  };

  const exportRows = buildExportRows(table, (c) => [
    c.warehouseName ?? "",
    INVENTORY_COUNT_KIND_LABELS[c.kind] ?? c.kind,
    c.createdAt,
    INVENTORY_COUNT_STATUS_LABELS[c.status] ?? c.status,
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <WarehouseIcon className="size-6 text-p3" />Conteos
                <PageHelpTooltip content={SCREEN_HELP["logistica/conteos"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{totalRows} conteos</p>
            </div>
            {can("inventory_counts:create") && (
              <Button size="sm" className="gap-1.5" onClick={() => setDialog(true)}>
                <Plus className="size-4" />Nuevo conteo
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={5}>
            <ExportButton
              headers={["Depósito", "Tipo", "Creado", "Estado"]}
              {...exportRows}
              filename="conteos"
            />
          </ERPDataTable>
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo conteo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Depósito</label>
              <select value={form.warehouseId} onChange={(e) => setForm((p) => ({ ...p, warehouseId: e.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Seleccioná depósito</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Tipo</label>
              <select value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as InventoryCountKind }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="cycle">Cíclico</option>
                <option value="full">Total</option>
                <option value="spot">Puntual</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Notas</label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={create} disabled={!form.warehouseId || acting}>
              {acting && <Loader2 className="size-4 mr-2 animate-spin" />}Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
