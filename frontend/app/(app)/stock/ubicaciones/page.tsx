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
import { MapPin, Plus, Pencil, MoreHorizontal } from "lucide-react";
import { getWarehouseLocationsQuery } from "@/lib/actions/warehouse-locations";
import { getWarehouses } from "@/lib/actions/settings";
import { WarehouseLocationForm } from "@/components/forms/warehouse-location-form";
import type { WarehouseLocation, Warehouse } from "@/lib/types";
import { LOCATION_KIND_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const LOCATION_KIND_OPTIONS = Object.keys(LOCATION_KIND_LABELS).map((k) => ({
  label: LOCATION_KIND_LABELS[k], value: k,
}));

const statusColors: Record<string, string> = {
  active:   "bg-p3/10 text-p4 dark:text-p2",
  inactive: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export default function UbicacionesPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<WarehouseLocation[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [locationFormOpen, setLocationFormOpen] = React.useState(false);
  const [editLocation, setEditLocation] = React.useState<WarehouseLocation | undefined>();

  const warehouseOptions = React.useMemo(
    () => warehouses.map((w) => ({ label: w.name, value: w.id })),
    [warehouses],
  );

  const columns = React.useMemo<ColumnDef<WarehouseLocation>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar código...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Código" />,
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
        meta: { label: "Código" },
      },
      {
        id: "warehouseId",
        accessorKey: "warehouseId",
        header: "Depósito",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.warehouseName ?? "—"}</span>
        ),
        meta: { label: "Depósito", variant: "multiSelect", options: warehouseOptions },
        enableColumnFilter: true,
      },
      {
        id: "kind",
        accessorKey: "kind",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
            {LOCATION_KIND_LABELS[row.original.kind] ?? row.original.kind}
          </span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: LOCATION_KIND_OPTIONS },
        enableColumnFilter: true,
      },
      {
        id: "aisle",
        accessorFn: (row) => [row.aisle, row.rack, row.shelf, row.bin].filter(Boolean).join(" / "),
        header: "Pasillo / Rack",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {[row.original.aisle, row.original.rack, row.original.shelf, row.original.bin].filter(Boolean).join(" / ") || "—"}
          </span>
        ),
        meta: { label: "Pasillo / Rack" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {row.original.status === "active" ? "Activa" : "Inactiva"}
          </span>
        ),
        meta: { label: "Estado" },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          if (!can("warehouse_locations:update")) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onSelect={() => { setEditLocation(row.original); setLocationFormOpen(true); }}>
                    <Pencil /> Editar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [can, warehouseOptions],
  );

  const { table } = useDataTable({
    data: items,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false },
      sorting: [{ id: "code", desc: false }],
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
    return getWarehouseLocationsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getWarehouses().then((w) => setWarehouses(w.items)).catch(() => void 0);
  }, []);

  const exportRows = buildExportRows(table, (l) => [
    l.code,
    l.warehouseName ?? "",
    LOCATION_KIND_LABELS[l.kind] ?? l.kind,
    [l.aisle, l.rack, l.shelf, l.bin].filter(Boolean).join(" / "),
    l.status === "active" ? "Activa" : "Inactiva",
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <MapPin className="size-6 text-p3" />
                Ubicaciones
                <PageHelpTooltip content={SCREEN_HELP["stock/ubicaciones"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{totalRows} ubicaciones</p>
            </div>
            {can("warehouse_locations:create") && (
              <Button size="sm" className="gap-1.5" onClick={() => { setEditLocation(undefined); setLocationFormOpen(true); }}>
                <Plus className="size-4" />Nueva ubicación
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
            <ExportButton
              headers={["Código", "Depósito", "Tipo", "Pasillo/Rack", "Estado"]}
              {...exportRows}
              filename="stock-ubicaciones"
            />
          </ERPDataTable>
        </div>
      </div>

      <WarehouseLocationForm
        open={locationFormOpen}
        onOpenChange={(open) => {
          setLocationFormOpen(open);
          if (!open) { setEditLocation(undefined); fetchPageRef.current?.(); }
        }}
        location={editLocation}
      />
    </>
  );
}
