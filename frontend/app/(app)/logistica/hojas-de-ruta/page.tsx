"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import {
  Receipt,
  Plus,
  Loader2,
  Tag,
  MoreHorizontal,
  Printer,
  Send,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  getDispatchSheetsQuery,
  createDispatchSheet,
  printDispatchSheet,
  dispatchDispatchSheet,
  closeDispatchSheet,
} from "@/lib/actions/dispatch-sheets";
import { getVehicles } from "@/lib/actions/vehicles";
import { getDrivers } from "@/lib/actions/drivers";
import { getWarehouses } from "@/lib/actions/settings";
import type { DispatchSheet, DispatchSheetStatus, Vehicle, Driver, Warehouse } from "@/lib/types";
import { DISPATCH_SHEET_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(DISPATCH_SHEET_STATUS_LABELS) as DispatchSheetStatus[]).map((s) => ({
  label: DISPATCH_SHEET_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<DispatchSheetStatus, string> = {
  draft:      "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  printed:    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  dispatched: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  closed:     "bg-p3/10 text-p4 dark:text-p2",
};

export default function HojasDeRutaPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<DispatchSheet[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [dialog, setDialog] = React.useState(false);
  const [acting, setActing] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    vehicleId: "",
    driverId: "",
    warehouseId: "",
  });

  const columns = React.useMemo<ColumnDef<DispatchSheet>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar patente o chofer...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.date.slice(0, 10)}</span>,
        meta: { label: "Fecha" },
      },
      {
        id: "vehiclePlate",
        accessorFn: (row) => row.vehiclePlate ?? "",
        header: "Vehículo",
        cell: ({ row }) => <span className="text-sm">{row.original.vehiclePlate ?? "—"}</span>,
        meta: { label: "Vehículo" },
      },
      {
        id: "driverName",
        accessorFn: (row) => row.driverName ?? "",
        header: "Chofer",
        cell: ({ row }) => <span className="text-sm">{row.original.driverName ?? "—"}</span>,
        meta: { label: "Chofer" },
      },
      {
        id: "warehouseName",
        accessorFn: (row) => row.warehouseName ?? "",
        header: "Depósito",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.warehouseName ?? "—"}</span>,
        meta: { label: "Depósito" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {DISPATCH_SHEET_STATUS_LABELS[row.original.status]}
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
          const s = row.original;
          const canPrint = can("dispatch_sheets:print");
          const canDispatch = can("dispatch_sheets:update") && s.status === "printed";
          const canClose = can("dispatch_sheets:close") && s.status === "dispatched";
          if (!canPrint && !canDispatch && !canClose) return null;
          const printLabel = s.status === "draft" ? "Imprimir" : "Reimprimir";
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {canPrint && (
                    <DropdownMenuItem onSelect={async () => {
                      try {
                        await printDispatchSheet(s.id);
                        window.open(`/imprimir/hoja-de-ruta/${s.id}`, "_blank", "noopener");
                        fetchPageRef.current?.();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Error");
                      }
                    }}>
                      <Printer /> {printLabel}
                    </DropdownMenuItem>
                  )}
                  {canDispatch && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await dispatchDispatchSheet(s.id); toast.success("Hoja despachada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Send /> Despachar
                    </DropdownMenuItem>
                  )}
                  {canClose && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await closeDispatchSheet(s.id); toast.success("Hoja cerrada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Lock /> Cerrar
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

  const initialLoadDone = React.useRef(false);
  const fetchPageRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getDispatchSheetsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    Promise.all([getVehicles({ limit: 500 }), getDrivers({ limit: 500 }), getWarehouses()])
      .then(([v, d, w]) => { setVehicles(v.items); setDrivers(d.items); setWarehouses(w.items); })
      .catch(() => void 0);
  }, []);

  const create = async () => {
    setActing("create");
    try {
      const data = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      const created = await createDispatchSheet(data);
      toast.success("Hoja creada", {
        description: `Fecha ${created.date.slice(0, 10)}${created.vehiclePlate ? ` · ${created.vehiclePlate}` : ""}`,
      });
      setDialog(false);
      setForm({ date: new Date().toISOString().slice(0, 10), vehicleId: "", driverId: "", warehouseId: "" });
      fetchPageRef.current?.();
    } catch (err) { toast.error("Error", { description: err instanceof Error ? err.message : "" }); }
    finally { setActing(null); }
  };

  const exportRows = buildExportRows(table, (s) => [
    s.date.slice(0, 10),
    s.vehiclePlate ?? "",
    s.driverName ?? "",
    s.warehouseName ?? "",
    DISPATCH_SHEET_STATUS_LABELS[s.status] ?? s.status,
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <Receipt className="size-6 text-p3" />Hojas de ruta
                <PageHelpTooltip content={SCREEN_HELP["logistica/hojas-de-ruta"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{totalRows} hojas</p>
            </div>
            {can("dispatch_sheets:create") && (
              <Button size="sm" className="gap-1.5" onClick={() => setDialog(true)}>
                <Plus className="size-4" />Nueva hoja
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
            <ExportButton
              headers={["Fecha", "Vehículo", "Chofer", "Depósito", "Estado"]}
              {...exportRows}
              filename="hojas-de-ruta"
            />
          </ERPDataTable>
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva hoja de ruta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium block mb-1.5">Fecha</label><Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="h-9 text-sm" /></div>
            <div><label className="text-sm font-medium block mb-1.5">Depósito</label>
              <select value={form.warehouseId} onChange={(e) => setForm((p) => ({ ...p, warehouseId: e.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Sin asignar</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1.5">Vehículo</label>
                <select value={form.vehicleId} onChange={(e) => setForm((p) => ({ ...p, vehicleId: e.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">—</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium block mb-1.5">Chofer</label>
                <select value={form.driverId} onChange={(e) => setForm((p) => ({ ...p, driverId: e.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">—</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={create} disabled={!!acting}>
              {acting === "create" && <Loader2 className="size-4 mr-2 animate-spin" />}Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
