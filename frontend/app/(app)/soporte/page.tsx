"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { LifeBuoy, Plus, Tag, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { getSupportTicketsQuery, getSupportTicketsSummary } from "@/lib/actions/support-tickets";
import {
  SUPPORT_TICKET_STATUS_LABELS,
  SUPPORT_TICKET_PRIORITY_LABELS,
  SUPPORT_TICKET_TYPE_LABELS,
  type SupportTicket,
  type SupportTicketStatus,
  type SupportTicketPriority,
  type SupportTicketType,
  type SupportTicketsSummary,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { SupportTicketForm } from "@/components/forms/support-ticket-form";

const STATUS_OPTIONS = (Object.keys(SUPPORT_TICKET_STATUS_LABELS) as SupportTicketStatus[]).map((s) => ({
  label: SUPPORT_TICKET_STATUS_LABELS[s], value: s,
}));
const PRIORITY_OPTIONS = (Object.keys(SUPPORT_TICKET_PRIORITY_LABELS) as SupportTicketPriority[]).map((p) => ({
  label: SUPPORT_TICKET_PRIORITY_LABELS[p], value: p,
}));
const TYPE_OPTIONS = (Object.keys(SUPPORT_TICKET_TYPE_LABELS) as SupportTicketType[]).map((t) => ({
  label: SUPPORT_TICKET_TYPE_LABELS[t], value: t,
}));

const typeColors: Record<SupportTicketType, string> = {
  bug:      "bg-red-500/10 text-red-600 dark:text-red-400",
  question: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  change:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const statusColors: Record<SupportTicketStatus, string> = {
  created:     "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  review:      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  resolved:    "bg-p3/10 text-p4 dark:text-p2",
};

const priorityColors: Record<SupportTicketPriority, string> = {
  low:    "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  normal: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  high:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  urgent: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function SoportePage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<SupportTicket[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [summary, setSummary] = React.useState<SupportTicketsSummary | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  const initialLoadDone = React.useRef(false);
  const fetchPageRef = React.useRef<(() => void) | null>(null);

  const columns = React.useMemo<ColumnDef<SupportTicket>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar por título o descripción...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "ticketNumber",
        accessorKey: "ticketNumber",
        header: ({ column }) => <DataTableColumnHeader column={column} label="#" />,
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {row.original.ticketNumber != null ? `#${String(row.original.ticketNumber).padStart(4, "0")}` : "—"}
          </span>
        ),
        meta: { label: "Número" },
        size: 72,
      },
      {
        id: "title",
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Título" />,
        cell: ({ row }) => (
          <Link
            href={`/soporte/${row.original.id}`}
            className="text-sm font-medium hover:underline line-clamp-1"
            title={row.original.title}
          >
            {row.original.title}
          </Link>
        ),
        meta: { label: "Título" },
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", typeColors[row.original.type as SupportTicketType] ?? "bg-muted text-muted-foreground")}>
            {SUPPORT_TICKET_TYPE_LABELS[row.original.type as SupportTicketType] ?? row.original.type}
          </span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: TYPE_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {SUPPORT_TICKET_STATUS_LABELS[row.original.status] ?? row.original.status}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "priority",
        accessorKey: "priority",
        header: "Prioridad",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColors[row.original.priority])}>
            {SUPPORT_TICKET_PRIORITY_LABELS[row.original.priority] ?? row.original.priority}
          </span>
        ),
        meta: { label: "Prioridad", variant: "multiSelect", options: PRIORITY_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "appEnv",
        accessorKey: "appEnv",
        header: "Ambiente",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.appEnv ?? "—"}
          </span>
        ),
        meta: { label: "Ambiente" },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Creado" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
        meta: { label: "Creado" },
      },
      {
        id: "lastActivityAt",
        accessorKey: "lastActivityAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Última actividad" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.lastActivityAt)}
          </span>
        ),
        meta: { label: "Última actividad" },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => (
          <Link href={`/soporte/${row.original.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Eye className="size-4" />
            </Button>
          </Link>
        ),
      },
    ],
    [],
  );

  const { table } = useDataTable({
    data: items,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false },
      sorting: [{ id: "lastActivityAt", desc: true }],
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

  const fetchPage = React.useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
    try {
      const { items: rows, meta } = await getSupportTicketsQuery(filterParams);
      setItems(rows ?? []);
      setPageCount(meta?.totalPages ?? 1);
    } finally {
      initialLoadDone.current = true;
      setLoading(false);
    }
  }, [filterParams]);

  fetchPageRef.current = fetchPage;

  React.useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  React.useEffect(() => {
    void getSupportTicketsSummary(filterParams).then(setSummary).catch(() => setSummary(null));
  }, [filterParams]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <LifeBuoy className="size-5 text-primary" />
            Soporte
          </h1>
          <p className="text-sm text-muted-foreground">
            Tickets internos. Cada ticket queda registrado con su timeline completo.
          </p>
        </div>
        {can("support_tickets:create") && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            Nuevo ticket
          </Button>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryTile label="Total" value={summary.total} />
          <SummaryTile label="Creados" value={summary.byStatus?.created ?? 0} />
          <SummaryTile label="En progreso" value={summary.byStatus?.in_progress ?? 0} />
          <SummaryTile label="En revisión" value={summary.byStatus?.review ?? 0} />
        </div>
      )}

      <ERPDataTable
        table={table}
        loading={loading}
      />

      <SupportTicketForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={() => void fetchPage()}
      />
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
