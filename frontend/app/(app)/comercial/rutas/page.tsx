"use client";

import * as React from "react";
import Link from "next/link";
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
import { Route as RouteIcon, Plus, Pencil, Tag, MapPin, MoreHorizontal } from "lucide-react";
import { RouteForm } from "@/components/forms/route-form";
import { getRoutesQuery } from "@/lib/actions/routes";
import { getSalesZones } from "@/lib/actions/sales-zones";
import type { Route, SalesZone } from "@/lib/types";
import { ROUTE_FREQUENCY_LABELS, WEEKDAY_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = [
  { label: "Activa", value: "active" },
  { label: "Inactiva", value: "inactive" },
];

const statusColors: Record<string, string> = {
  active:   "bg-p3/10 text-p4 dark:text-p2",
  inactive: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export default function RutasPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Route[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [zones, setZones] = React.useState<SalesZone[]>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editRoute, setEditRoute] = React.useState<Route | undefined>();

  const zoneOptions = React.useMemo(
    () => zones.map((z) => ({ label: z.code, value: z.id })),
    [zones],
  );

  const columns = React.useMemo<ColumnDef<Route>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar código o nombre...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Código" />,
        cell: ({ row }) => (
          <Link href={`/comercial/rutas/${row.original.id}`} className="font-mono text-sm hover:underline">
            {row.original.code}
          </Link>
        ),
        meta: { label: "Código" },
      },
      {
        id: "name",
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => <span className="font-medium text-sm">{row.original.name}</span>,
        meta: { label: "Nombre" },
      },
      {
        id: "zoneId",
        accessorKey: "zoneId",
        header: "Zona",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.zoneName ?? "—"}</span>
        ),
        meta: { label: "Zona", variant: "multiSelect", options: zoneOptions, icon: MapPin },
        enableColumnFilter: true,
      },
      {
        id: "frequency",
        accessorKey: "frequency",
        header: "Frecuencia",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {ROUTE_FREQUENCY_LABELS[row.original.frequency] ?? row.original.frequency}
          </span>
        ),
        meta: { label: "Frecuencia" },
      },
      {
        id: "weekdays",
        accessorFn: (row) => row.weekdays?.join(",") ?? "",
        header: "Días",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.weekdays && row.original.weekdays.length > 0
              ? row.original.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")
              : "—"}
          </span>
        ),
        meta: { label: "Días" },
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
          if (!can("routes:update")) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onSelect={() => { setEditRoute(row.original); setDrawerOpen(true); }}>
                    <Pencil /> Editar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [can, zoneOptions],
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
    return getRoutesQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getSalesZones({ limit: 500 })
      .then((z) => setZones(z.items))
      .catch(() => void 0);
  }, []);

  const exportRows = buildExportRows(table, (x) => [
    x.code,
    x.name,
    x.zoneName ?? "",
    ROUTE_FREQUENCY_LABELS[x.frequency] ?? x.frequency,
    x.weekdays?.map((d) => WEEKDAY_LABELS[d]).join(", ") ?? "",
    x.status === "active" ? "Activa" : "Inactiva",
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <RouteIcon className="size-6 text-p3" />
                Rutas
                <PageHelpTooltip content={SCREEN_HELP["comercial/rutas"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{totalRows} rutas</p>
            </div>
            {can("routes:create") && (
              <Button size="sm" className="h-9 gap-1.5"
                onClick={() => { setEditRoute(undefined); setDrawerOpen(true); }}>
                <Plus className="size-4" />
                Nueva ruta
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={8}>
            <ExportButton
              headers={["Código", "Nombre", "Zona", "Frecuencia", "Días", "Estado"]}
              {...exportRows}
              filename="rutas"
            />
          </ERPDataTable>
        </div>
      </div>

      <RouteForm
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) { setEditRoute(undefined); fetchPageRef.current?.(); }
        }}
        route={editRoute}
      />
    </>
  );
}
