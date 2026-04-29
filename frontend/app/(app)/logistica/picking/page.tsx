"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { ClipboardList, Tag } from "lucide-react";
import { getPickingTasks } from "@/lib/actions/picking";
import { formatDate } from "@/lib/format";
import type { PickingTask, PickingStatus } from "@/lib/types";
import { PICKING_STATUS_LABELS } from "@/lib/types";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { multiSelectFilterFn } from "@/lib/data-table-filters";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(PICKING_STATUS_LABELS) as PickingStatus[]).map((s) => ({
  label: PICKING_STATUS_LABELS[s],
  value: s,
}));

export default function PickingPage() {
  const [loading, setLoading] = React.useState(true);
  const [tasks, setTasks] = React.useState<PickingTask[]>([]);

  React.useEffect(() => {
    getPickingTasks({ limit: 500 }).then((r) => setTasks(r.items)).finally(() => setLoading(false));
  }, []);

  const columns = React.useMemo<ColumnDef<PickingTask>[]>(
    () => [
      {
        id: "orderNumber",
        accessorFn: (row) => row.orderNumber ?? row.orderId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Pedido" />,
        cell: ({ row }) => (
          <Link href={`/logistica/picking/${row.original.id}`} className="font-mono text-sm hover:underline">
            {row.original.orderNumber ? String(row.original.orderNumber) : 'Pedido eliminado'}
          </Link>
        ),
        meta: { label: "Pedido", placeholder: "Buscar pedido...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "warehouseName",
        accessorFn: (row) => row.warehouseName ?? "",
        header: "Depósito",
        cell: ({ row }) => <span className="text-sm">{row.original.warehouseName ?? "—"}</span>,
        meta: { label: "Depósito" },
      },
      {
        id: "assignedToName",
        accessorFn: (row) => row.assignedToName ?? "",
        header: "Asignado a",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.assignedToName ?? <span className="text-muted-foreground">Sin asignar</span>}
          </span>
        ),
        meta: { label: "Asignado a" },
      },
      {
        id: "priority",
        accessorKey: "priority",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Prioridad" />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.priority}</span>,
        meta: { label: "Prioridad" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "staged" ? "default" : "outline"}>
            {PICKING_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
        filterFn: multiSelectFilterFn,
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Creada" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
        meta: { label: "Creada" },
        sortingFn: (a, b) => a.original.createdAt.localeCompare(b.original.createdAt),
      },
    ],
    [],
  );

  const { table } = useDataTable({
    data: tasks,
    columns,
    pageCount: -1,
    getRowId: (row) => row.id,
    manualMode: false,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const exportRows = buildExportRows(table, (t) => [
    t.orderNumber ? String(t.orderNumber) : 'Pedido eliminado',
    t.warehouseName ?? "",
    t.assignedToName ?? "",
    String(t.priority),
    PICKING_STATUS_LABELS[t.status] ?? t.status,
    t.createdAt,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <ClipboardList className="size-6 text-p3" />Picking
            <PageHelpTooltip content={SCREEN_HELP["logistica/picking"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} tareas en total</p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
          <ExportButton
            headers={["Pedido", "Depósito", "Asignado", "Prioridad", "Estado", "Creada"]}
            {...exportRows}
            filename="picking"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
