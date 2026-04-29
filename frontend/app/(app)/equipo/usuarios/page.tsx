"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCog, Tag } from "lucide-react";
import { getTeamQuery, getRoles } from "@/lib/actions/team";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { User, Role, UserStatus } from "@/lib/types";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const USER_STATUS_OPTIONS: { label: string; value: UserStatus }[] = [
  { label: "Activo", value: "active" },
  { label: "Inactivo", value: "inactive" },
  { label: "Suspendido", value: "suspended" },
];

const statusColors: Record<string, string> = {
  active:    "bg-p3/10 text-p4 dark:text-p2",
  inactive:  "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  suspended: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  active: "Activo", inactive: "Inactivo", suspended: "Suspendido",
};

export default function UsuariosPage() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<User[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [roles, setRoles] = React.useState<Role[]>([]);

  const roleMap = React.useMemo(() => {
    const m = new Map<string, Role>();
    roles.forEach((r) => m.set(r.id, r));
    return m;
  }, [roles]);

  const roleOptions = React.useMemo(
    () => roles.map((r) => ({ label: r.name, value: r.id })),
    [roles],
  );

  const columns = React.useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar por nombre o email...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "first_name",
        accessorFn: (row) => `${row.first_name} ${row.last_name} ${row.email}`,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
        cell: ({ row }) => {
          const initials = `${row.original.first_name.charAt(0)}${row.original.last_name.charAt(0)}`.toUpperCase();
          return (
            <div className="flex items-center gap-2.5">
              <Avatar className="size-7">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{row.original.first_name} {row.original.last_name}</span>
            </div>
          );
        },
        meta: { label: "Nombre" },
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
        meta: { label: "Email" },
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "Teléfono",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.phone ?? "—"}</span>,
        meta: { label: "Teléfono" },
      },
      {
        id: "roleId",
        accessorKey: "roleId",
        header: "Rol",
        cell: ({ row }) => {
          const r = roleMap.get(row.original.roleId);
          return (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
              {r?.name ?? "Sin rol"}
            </span>
          );
        },
        meta: { label: "Rol", variant: "multiSelect", options: roleOptions },
        enableColumnFilter: true,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {statusLabels[row.original.status] ?? row.original.status}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: USER_STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "lastLoginAt",
        accessorKey: "lastLoginAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Último acceso" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.lastLoginAt ? formatDate(row.original.lastLoginAt) : "—"}
          </span>
        ),
        meta: { label: "Último acceso" },
      },
    ],
    [roleMap, roleOptions],
  );

  const { table } = useDataTable({
    data: items,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false },
      sorting: [{ id: "first_name", desc: false }],
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
    return getTeamQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getRoles().then((r) => setRoles(r.items)).catch(() => void 0);
  }, []);

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UserCog className="size-6 text-p3" />
            Usuarios
            <PageHelpTooltip content={SCREEN_HELP["equipo/usuarios"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalRows} usuarios</p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={6} />
      </div>
    </div>
  );
}
