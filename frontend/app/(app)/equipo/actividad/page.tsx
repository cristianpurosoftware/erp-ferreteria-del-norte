"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList, Clock, Tag } from "lucide-react";
import { getTeam, getActivityLogQuery, getAuditFacets } from "@/lib/actions/team";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { User, AuditEvent } from "@/lib/types";
import {
  AUDIT_RESULT_LABELS,
  formatAuditAction,
  formatAuditEntity,
  formatAuditActor,
} from "@/lib/types";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

export default function ActividadPage() {
  const [loading, setLoading] = React.useState(true);
  const [events, setEvents] = React.useState<AuditEvent[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [users, setUsers] = React.useState<User[]>([]);
  const [facets, setFacets] = React.useState<{ entityTypes: string[]; actions: string[] }>({
    entityTypes: [], actions: [],
  });

  const userMap = React.useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const entityOptions = React.useMemo(
    () => facets.entityTypes.map((e) => ({ label: formatAuditEntity(e), value: e })),
    [facets.entityTypes],
  );
  const actionOptions = React.useMemo(
    () => facets.actions.map((a) => ({ label: formatAuditAction(a), value: a })),
    [facets.actions],
  );

  React.useEffect(() => {
    Promise.all([getTeam({ limit: 500 }), getAuditFacets()])
      .then(([u, f]) => { setUsers(u.items); setFacets(f); })
      .catch(() => void 0);
  }, []);

  const columns = React.useMemo<ColumnDef<AuditEvent>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar actor, entidad o referencia...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha y hora" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
        meta: { label: "Fecha y hora" },
      },
      {
        id: "actor",
        accessorFn: (row) => {
          if (!row.actor_id) return formatAuditActor(row.actor_type);
          const u = userMap.get(row.actor_id);
          return u ? `${u.first_name} ${u.last_name}` : formatAuditActor(row.actor_type);
        },
        header: "Actor",
        cell: ({ row }) => {
          if (row.original.actor_type !== "user" || !row.original.actor_id) {
            return (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                {formatAuditActor(row.original.actor_type)}
              </span>
            );
          }
          const u = userMap.get(row.original.actor_id);
          return (
            <span className="text-sm">
              {u ? `${u.first_name} ${u.last_name}` : "Usuario eliminado"}
            </span>
          );
        },
        meta: { label: "Actor" },
      },
      {
        id: "action",
        accessorKey: "action",
        header: "Acción",
        cell: ({ row }) => (
          <span className="text-sm">{formatAuditAction(row.original.action)}</span>
        ),
        meta: { label: "Acción", variant: "multiSelect", options: actionOptions, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "entity_type",
        accessorKey: "entity_type",
        header: "Entidad",
        cell: ({ row }) => (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
            {formatAuditEntity(row.original.entity_type)}
          </span>
        ),
        meta: { label: "Entidad", variant: "multiSelect", options: entityOptions },
        enableColumnFilter: true,
      },
      {
        id: "entity_id",
        accessorKey: "entity_id",
        header: "Referencia",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.entityLabel ?? row.original.entity_id.slice(0, 8)}
          </span>
        ),
        meta: { label: "Referencia" },
      },
      {
        id: "result",
        accessorKey: "result",
        header: "Resultado",
        cell: ({ row }) => (
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            row.original.result === "success"
              ? "bg-p3/10 text-p4 dark:text-p2"
              : "bg-red-500/10 text-red-600 dark:text-red-400",
          )}>
            {AUDIT_RESULT_LABELS[row.original.result] ?? row.original.result}
          </span>
        ),
        meta: { label: "Resultado" },
      },
    ],
    [userMap, actionOptions, entityOptions],
  );

  const { table } = useDataTable({
    data: events,
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

  const fetchPage = React.useCallback(() => {
    setLoading(true);
    return getActivityLogQuery(filterParams)
      .then((r) => { setEvents(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => setLoading(false));
  }, [filterParams]);

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardList className="size-6 text-p3" />
            Actividad
            <PageHelpTooltip content={SCREEN_HELP["equipo/actividad"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            <Clock className="size-3.5" />
            {totalRows} eventos registrados en el sistema.
          </p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={6} />
      </div>
    </div>
  );
}
