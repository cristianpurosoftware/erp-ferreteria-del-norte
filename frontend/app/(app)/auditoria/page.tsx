"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { History, Tag, Eye, RotateCcw } from "lucide-react";
import {
  getActivityLogQuery,
  getAuditFacets,
  getAuditEventById,
  getTeam,
} from "@/lib/actions/team";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { User, AuditEvent } from "@/lib/types";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS, AUDIT_RESULT_LABELS } from "@/lib/types";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { AuditDetailModal } from "@/components/audit/audit-detail-modal";
import { toast } from "sonner";

const RESULT_OPTIONS = [
  { label: "Exitoso", value: "success" },
  { label: "Error", value: "failure" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AuditoriaPage() {
  const [loading, setLoading] = React.useState(true);
  const [events, setEvents] = React.useState<AuditEvent[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [users, setUsers] = React.useState<User[]>([]);
  const [facets, setFacets] = React.useState<{ entityTypes: string[]; actions: string[] }>({
    entityTypes: [],
    actions: [],
  });

  const [dateFrom, setDateFrom] = React.useState<string>(daysAgoIso(30));
  const [dateTo, setDateTo] = React.useState<string>(todayIso());
  const [actorId, setActorId] = React.useState<string>("");
  const [entityType, setEntityType] = React.useState<string>("");
  const [action, setAction] = React.useState<string>("");
  const [result, setResult] = React.useState<string>("");

  const [selected, setSelected] = React.useState<AuditEvent | null>(null);

  const userMap = React.useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  React.useEffect(() => {
    Promise.all([getTeam({ limit: 500 }), getAuditFacets()])
      .then(([u, f]) => { setUsers(u.items); setFacets(f); })
      .catch(() => void 0);
  }, []);

  const resetFilters = () => {
    setDateFrom(daysAgoIso(30));
    setDateTo(todayIso());
    setActorId("");
    setEntityType("");
    setAction("");
    setResult("");
  };

  const entityOptions = React.useMemo(
    () => facets.entityTypes.map((e) => ({ label: AUDIT_ENTITY_LABELS[e] ?? e, value: e })),
    [facets.entityTypes],
  );
  const actionOptions = React.useMemo(
    () => facets.actions.map((a) => ({ label: AUDIT_ACTION_LABELS[a] ?? a, value: a })),
    [facets.actions],
  );

  const resolveActorName = React.useCallback(
    (event: AuditEvent): string => {
      if (event.actor_type !== "user" || !event.actor_id) {
        return event.actor_type === "system" ? "Sistema" : event.actor_type;
      }
      const u = userMap.get(event.actor_id);
      return u ? `${u.first_name} ${u.last_name}` : event.actor_id.slice(0, 8);
    },
    [userMap],
  );

  const openDetail = React.useCallback(async (event: AuditEvent) => {
    try {
      const full = await getAuditEventById(event.id);
      setSelected({ ...event, ...full });
    } catch { setSelected(event); }
  }, []);

  const columns = React.useMemo<ColumnDef<AuditEvent>[]>(
    () => [
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.createdAt)}
          </span>
        ),
        meta: { label: "Fecha" },
      },
      {
        id: "actor",
        accessorFn: (row) => resolveActorName(row),
        header: "Usuario",
        cell: ({ row }) => {
          const e = row.original;
          if (e.actor_type !== "user" || !e.actor_id) {
            return (
              <Badge variant="outline" className="text-[10px]">
                {e.actor_type === "system" ? "Sistema" : e.actor_type}
              </Badge>
            );
          }
          return <span className="text-sm">{resolveActorName(e)}</span>;
        },
        meta: { label: "Usuario" },
      },
      {
        id: "action",
        accessorKey: "action",
        header: "Acción",
        cell: ({ row }) => (
          <span className="text-sm">{AUDIT_ACTION_LABELS[row.original.action] ?? row.original.action}</span>
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
            {AUDIT_ENTITY_LABELS[row.original.entity_type] ?? row.original.entity_type}
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
      {
        id: "ip_address",
        accessorKey: "ip_address",
        header: "IP",
        cell: ({ row }) => (
          <span className="font-mono text-[10px] text-muted-foreground">
            {row.original.ip_address ?? "—"}
          </span>
        ),
        meta: { label: "IP" },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 80,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 gap-1 text-xs"
              onClick={(e) => { e.stopPropagation(); openDetail(row.original); }}
            >
              <Eye className="size-3.5" />
              Detalle
            </Button>
          </div>
        ),
        meta: { label: "" },
      },
    ],
    [actionOptions, entityOptions, resolveActorName, openDetail],
  );

  const { table } = useDataTable({
    data: events,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
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
    const params = new URLSearchParams(filterParams);
    if (dateFrom) params.set("createdAtFrom", `${dateFrom}T00:00:00.000Z`);
    if (dateTo) params.set("createdAtTo", `${dateTo}T23:59:59.999Z`);
    if (actorId) params.set("actorId", actorId);
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);
    if (result) params.set("result", result);
    return getActivityLogQuery(params.toString())
      .then((r) => { setEvents(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .catch((err) => {
        toast.error("No se pudo cargar el registro", { description: err instanceof Error ? err.message : "" });
      })
      .finally(() => setLoading(false));
  }, [filterParams, dateFrom, dateTo, actorId, entityType, action, result]);

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  const exportRows = buildExportRows(table, (e) => [
    e.createdAt,
    resolveActorName(e),
    AUDIT_ACTION_LABELS[e.action] ?? e.action,
    AUDIT_ENTITY_LABELS[e.entity_type] ?? e.entity_type,
    e.entityLabel ?? e.entity_id,
    e.result,
    e.ip_address ?? "",
  ]);

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
              <History className="size-6 text-p3" />
              Auditoría
              <PageHelpTooltip content={SCREEN_HELP.auditoria} />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalRows} eventos en el rango seleccionado
            </p>
          </div>
          <ExportButton
            variant="page"
            filename="auditoria"
            headers={["Fecha", "Usuario", "Acción", "Entidad", "Referencia", "Resultado", "IP"]}
            {...exportRows}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Desde</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm w-40" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Hasta</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm w-40" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Usuario</label>
            <select value={actorId} onChange={(e) => setActorId(e.target.value)} className="h-9 text-sm rounded-md border border-border bg-background px-2 w-48">
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Entidad</label>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="h-9 text-sm rounded-md border border-border bg-background px-2 w-44">
              <option value="">Todas</option>
              {facets.entityTypes.map((t) => (
                <option key={t} value={t}>{AUDIT_ENTITY_LABELS[t] ?? t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Acción</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="h-9 text-sm rounded-md border border-border bg-background px-2 w-52">
              <option value="">Todas</option>
              {facets.actions.map((a) => (
                <option key={a} value={a}>{AUDIT_ACTION_LABELS[a] ?? a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Resultado</label>
            <select value={result} onChange={(e) => setResult(e.target.value)} className="h-9 text-sm rounded-md border border-border bg-background px-2 w-36">
              <option value="">Todos</option>
              {RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 gap-1.5">
            <RotateCcw className="size-3.5" />
            Limpiar
          </Button>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={8} />
      </div>

      <AuditDetailModal event={selected} userMap={userMap} onClose={() => setSelected(null)} />
    </div>
  );
}
