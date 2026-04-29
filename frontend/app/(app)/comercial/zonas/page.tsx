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
import { MapPin, Plus, Pencil, Tag, MoreHorizontal } from "lucide-react";
import { SalesZoneForm } from "@/components/forms/sales-zone-form";
import { getSalesZones, getSalesZonesQuery } from "@/lib/actions/sales-zones";
import type { SalesZone } from "@/lib/types";
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

export default function ZonasPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<SalesZone[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [allZones, setAllZones] = React.useState<SalesZone[]>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editZone, setEditZone] = React.useState<SalesZone | undefined>();

  const zoneMap = React.useMemo(() => {
    const m = new Map<string, SalesZone>();
    allZones.forEach((z) => m.set(z.id, z));
    return m;
  }, [allZones]);

  const columns = React.useMemo<ColumnDef<SalesZone>[]>(
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
          <Link href={`/comercial/zonas/${row.original.id}`} className="font-mono text-sm hover:underline">
            {row.original.code}
          </Link>
        ),
        meta: { label: "Código" },
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
        cell: ({ row }) => <span className="font-medium text-sm">{row.original.name}</span>,
        meta: { label: "Nombre" },
      },
      {
        id: "parentZoneId",
        accessorKey: "parentZoneId",
        header: "Zona padre",
        cell: ({ row }) => {
          const parent = row.original.parentZoneId ? zoneMap.get(row.original.parentZoneId) : null;
          return (
            <span className="text-sm text-muted-foreground">
              {parent ? `${parent.code} — ${parent.name}` : "—"}
            </span>
          );
        },
        meta: { label: "Zona padre" },
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
          if (!can("sales_zones:update")) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onSelect={() => { setEditZone(row.original); setDrawerOpen(true); }}>
                    <Pencil /> Editar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [can, zoneMap],
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
  const fetchAllRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getSalesZonesQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  const fetchAll = React.useCallback(() => {
    getSalesZones({ limit: 500 }).then((r) => setAllZones(r.items)).catch(() => void 0);
  }, []);
  fetchAllRef.current = fetchAll;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);
  React.useEffect(() => { fetchAll(); }, [fetchAll]);

  const exportRows = buildExportRows(table, (z) => {
    const parent = z.parentZoneId ? zoneMap.get(z.parentZoneId) : null;
    return [
      z.code,
      z.name,
      parent ? `${parent.code} — ${parent.name}` : "",
      z.status === "active" ? "Activa" : "Inactiva",
    ];
  });

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <MapPin className="size-6 text-p3" />
                Zonas
                <PageHelpTooltip content={SCREEN_HELP["comercial/zonas"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{totalRows} zonas</p>
            </div>
            {can("sales_zones:create") && (
              <Button size="sm" className="h-9 gap-1.5"
                onClick={() => { setEditZone(undefined); setDrawerOpen(true); }}>
                <Plus className="size-4" />
                Nueva zona
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
            <ExportButton
              headers={["Código", "Nombre", "Zona padre", "Estado"]}
              {...exportRows}
              filename="zonas"
            />
          </ERPDataTable>
        </div>
      </div>

      <SalesZoneForm
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setEditZone(undefined);
            fetchPageRef.current?.();
            fetchAllRef.current?.();
          }
        }}
        zone={editZone}
        zones={allZones}
      />
    </>
  );
}
