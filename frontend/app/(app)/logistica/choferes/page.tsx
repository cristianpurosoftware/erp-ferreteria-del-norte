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
import { UserCog, Plus, Pencil, Tag, MoreHorizontal } from "lucide-react";
import { DriverForm } from "@/components/forms/driver-form";
import { getDriversQuery } from "@/lib/actions/drivers";
import { getTeam } from "@/lib/actions/team";
import type { Driver, DriverStatus, User } from "@/lib/types";
import { DRIVER_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(DRIVER_STATUS_LABELS) as DriverStatus[]).map((s) => ({
  label: DRIVER_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<DriverStatus, string> = {
  active:   "bg-p3/10 text-p4 dark:text-p2",
  inactive: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export default function ChoferesPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Driver[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [users, setUsers] = React.useState<User[]>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<Driver | undefined>();

  const columns = React.useMemo<ColumnDef<Driver>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar por nombre o DNI...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "fullName",
        accessorKey: "fullName",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.fullName}</span>,
        meta: { label: "Nombre" },
      },
      {
        id: "dni",
        accessorKey: "dni",
        header: "DNI",
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.dni ?? "—"}</span>,
        meta: { label: "DNI" },
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "Teléfono",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.phone ?? "—"}</span>,
        meta: { label: "Teléfono" },
      },
      {
        id: "licenseNumber",
        accessorFn: (row) => `${row.licenseNumber ?? ""} ${row.licenseExpires ?? ""}`,
        header: "Licencia",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.licenseNumber ?? "—"}
            {row.original.licenseExpires ? ` (vence ${row.original.licenseExpires.slice(0, 10)})` : ""}
          </span>
        ),
        meta: { label: "Licencia" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {DRIVER_STATUS_LABELS[row.original.status]}
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
          if (!can("drivers:update")) return null;
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
      sorting: [{ id: "fullName", desc: false }],
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
    return getDriversQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getTeam({ limit: 200 }).then((t) => setUsers(t.items)).catch(() => void 0);
  }, []);

  const exportRows = buildExportRows(table, (d) => [
    d.fullName,
    d.dni ?? "",
    d.phone ?? "",
    d.licenseNumber ?? "",
    d.licenseExpires ?? "",
    DRIVER_STATUS_LABELS[d.status] ?? d.status,
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <UserCog className="size-6 text-p3" />Choferes
                <PageHelpTooltip content={SCREEN_HELP["logistica/choferes"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{totalRows} registrados</p>
            </div>
            {can("drivers:create") && (
              <Button size="sm" className="gap-1.5" onClick={() => { setEdit(undefined); setFormOpen(true); }}>
                <Plus className="size-4" />Nuevo chofer
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
            <ExportButton
              headers={["Nombre", "DNI", "Teléfono", "Licencia", "Vence", "Estado"]}
              {...exportRows}
              filename="choferes"
            />
          </ERPDataTable>
        </div>
      </div>
      <DriverForm
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) { setEdit(undefined); fetchPageRef.current?.(); } }}
        driver={edit}
        users={users.map((u) => ({ id: u.id, first_name: u.first_name, last_name: u.last_name }))}
      />
    </>
  );
}
