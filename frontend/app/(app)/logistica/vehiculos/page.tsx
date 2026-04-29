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
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { Truck, Plus, Pencil, Tag, MoreHorizontal } from "lucide-react";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { getVehiclesQuery } from "@/lib/actions/vehicles";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import { VEHICLE_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map((s) => ({
  label: VEHICLE_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<VehicleStatus, string> = {
  active:      "bg-p3/10 text-p4 dark:text-p2",
  maintenance: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  retired:     "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export default function VehiculosPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Vehicle[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [formOpen, setFormOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<Vehicle | undefined>();

  const columns = React.useMemo<ColumnDef<Vehicle>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar patente o modelo...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "plate",
        accessorKey: "plate",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Patente" />,
        cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.plate}</span>,
        meta: { label: "Patente" },
      },
      {
        id: "model",
        accessorKey: "model",
        header: "Modelo",
        cell: ({ row }) => <span className="text-sm">{row.original.model ?? "—"}</span>,
        meta: { label: "Modelo" },
      },
      {
        id: "capacity",
        accessorFn: (row) => row.capacityKg ?? 0,
        header: "Capacidad",
        enableSorting: false,
        cell: ({ row }) => {
          const v = row.original;
          return (
            <span className="text-sm text-muted-foreground">
              {v.capacityKg ? `${v.capacityKg}kg` : "—"}
              {v.capacityM3 ? ` · ${v.capacityM3}m³` : ""}
            </span>
          );
        },
        meta: { label: "Capacidad" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {VEHICLE_STATUS_LABELS[row.original.status]}
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
          if (!can("vehicles:update")) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onSelect={() => { setEdit(row.original); setFormOpen(true); }}>
                    <Pencil /> Editar
                  </DropdownMenuItem>
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
      sorting: [{ id: "plate", desc: false }],
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
    return getVehiclesQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  const exportRows = buildExportRows(table, (v) => [
    v.plate,
    v.model ?? "",
    v.capacityKg ? `${v.capacityKg}kg` : "",
    v.capacityM3 ? `${v.capacityM3}m³` : "",
    VEHICLE_STATUS_LABELS[v.status] ?? v.status,
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <Truck className="size-6 text-p3" />Vehículos
                <PageHelpTooltip content={SCREEN_HELP["logistica/vehiculos"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{totalRows} unidades</p>
            </div>
            {can("vehicles:create") && (
              <Button size="sm" className="gap-1.5" onClick={() => { setEdit(undefined); setFormOpen(true); }}>
                <Plus className="size-4" />Nuevo vehículo
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
            <ExportButton
              headers={["Patente", "Modelo", "Capacidad kg", "Capacidad m³", "Estado"]}
              {...exportRows}
              filename="vehiculos"
            />
          </ERPDataTable>
        </div>
      </div>
      <VehicleForm open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) { setEdit(undefined); fetchPageRef.current?.(); } }} vehicle={edit} />
    </>
  );
}
