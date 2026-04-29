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
  Truck,
  Plus,
  Tag,
  Calendar,
  User as UserIcon,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  XCircle,
  Package,
} from "lucide-react";
import { ShipmentForm } from "@/components/forms/shipment-form";
import {
  getShipmentsQuery,
  getShipmentsSummary,
  loadShipment,
  departShipment,
  completeShipment,
  cancelShipment,
} from "@/lib/actions/shipments";
import { getWarehouses } from "@/lib/actions/settings";
import { getVehicles } from "@/lib/actions/vehicles";
import { getDrivers } from "@/lib/actions/drivers";
import { getDispatchSheets } from "@/lib/actions/dispatch-sheets";
import type { Shipment, ShipmentStatus, Warehouse, Vehicle, Driver, DispatchSheet } from "@/lib/types";
import { SHIPMENT_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";
import { toast } from "sonner";

const STATUS_OPTIONS = (Object.keys(SHIPMENT_STATUS_LABELS) as ShipmentStatus[]).map((s) => ({
  label: SHIPMENT_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<ShipmentStatus, string> = {
  planned:    "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  loaded:     "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  in_transit: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  completed:  "bg-p3/10 text-p4 dark:text-p2",
  cancelled:  "bg-red-500/10 text-red-600 dark:text-red-400",
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function EnviosPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [shipments, setShipments] = React.useState<Shipment[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [inTransit, setInTransit] = React.useState(0);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [dispatchSheets, setDispatchSheets] = React.useState<DispatchSheet[]>([]);
  const [formOpen, setFormOpen] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      getWarehouses(),
      getVehicles({ limit: 500 }),
      getDrivers({ limit: 500 }),
      getDispatchSheets({ limit: 200 }),
    ]).then(([w, v, d, ds]) => {
      setWarehouses(w.items); setVehicles(v.items); setDrivers(d.items); setDispatchSheets(ds.items);
    });
  }, []);

  const columns = React.useMemo<ColumnDef<Shipment>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar por depósito, chofer o patente...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "plannedDate",
        accessorKey: "plannedDate",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha planificada" />,
        cell: ({ row }) => (
          <div>
            <Link href={`/logistica/envios/${row.original.id}`} className="text-sm hover:underline">
              {row.original.plannedDate.slice(0, 10)}
            </Link>
            <p className="text-xs text-muted-foreground">Creado: {formatDateTime(row.original.createdAt)}</p>
          </div>
        ),
        meta: { label: "Fecha planificada", icon: Calendar },
      },
      {
        id: "warehouseName",
        accessorFn: (row) => row.warehouseName ?? "",
        header: "Depósito",
        cell: ({ row }) => <span className="text-sm">{row.original.warehouseName ?? "—"}</span>,
        meta: { label: "Depósito" },
      },
      {
        id: "vehiclePlate",
        accessorFn: (row) => `${row.vehiclePlate ?? ""} ${row.driverName ?? ""}`,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Vehículo / Chofer" />,
        cell: ({ row }) => (
          <div>
            <span className="text-sm">{row.original.vehiclePlate ?? "—"}</span>
            {row.original.driverName && <p className="text-xs text-muted-foreground">{row.original.driverName}</p>}
          </div>
        ),
        meta: { label: "Vehículo / Chofer", icon: UserIcon },
      },
      {
        id: "totalStops",
        accessorKey: "totalStops",
        header: "Paradas",
        cell: ({ row }) => <span className="text-right tabular-nums text-sm block">{row.original.totalStops}</span>,
        meta: { label: "Paradas" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {SHIPMENT_STATUS_LABELS[row.original.status]}
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
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link href={`/logistica/envios/${s.id}`}>
                      <Eye /> Ver detalle
                    </Link>
                  </DropdownMenuItem>
                  {can("shipments:load") && s.status === "planned" && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await loadShipment(s.id); toast.success("Envío cargado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Package /> Cargar
                    </DropdownMenuItem>
                  )}
                  {can("shipments:depart") && s.status === "loaded" && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await departShipment(s.id); toast.success("Envío en tránsito"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Truck /> Salir
                    </DropdownMenuItem>
                  )}
                  {can("shipments:complete") && s.status === "in_transit" && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await completeShipment(s.id); toast.success("Envío completado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle2 /> Completar
                    </DropdownMenuItem>
                  )}
                  {can("shipments:cancel") && s.status !== "completed" && s.status !== "cancelled" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Cancelar envío?")) return;
                        try { await cancelShipment(s.id); toast.success("Envío cancelado"); fetchPageRef.current?.(); }
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
    data: shipments,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false },
      sorting: [{ id: "plannedDate", desc: true }],
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
    return getShipmentsQuery(filterParams)
      .then((r) => {
        setShipments(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total);
      })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getShipmentsSummary(summaryParams)
      .then((s) => setInTransit(s.byStatus.in_transit ?? 0))
      .catch(() => setInTransit(0));
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (s) => [
    s.plannedDate.slice(0, 10),
    s.warehouseName ?? "",
    s.vehiclePlate ?? "",
    s.driverName ?? "",
    String(s.totalStops),
    SHIPMENT_STATUS_LABELS[s.status] ?? s.status,
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <Truck className="size-6 text-p3" />Envíos
                <PageHelpTooltip content={SCREEN_HELP["logistica/envios"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalRows} envíos · {inTransit} en tránsito
              </p>
            </div>
            {can("shipments:create") && (
              <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
                <Plus className="size-4" />Nuevo envío
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={5}>
            <ExportButton
              headers={["Fecha", "Depósito", "Vehículo", "Chofer", "Paradas", "Estado"]}
              {...exportRows}
              filename="envios"
            />
          </ERPDataTable>
        </div>
      </div>

      <ShipmentForm
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) void fetchPage(); }}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
        vehicles={vehicles.map((v) => ({ id: v.id, plate: v.plate }))}
        drivers={drivers.map((d) => ({ id: d.id, fullName: d.fullName }))}
        dispatchSheets={dispatchSheets.map((ds) => ({ id: ds.id, date: ds.date }))}
      />
    </>
  );
}
