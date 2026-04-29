"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Clock,
  DollarSign,
  Hash,
  Package,
  Tag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";
import { getOrdersQuery, getOrdersSummary } from "@/lib/actions/orders";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Circle; color: string }> = {
  draft:                { label: "Borrador",       icon: Circle,       color: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  pending_confirmation: { label: "Pendiente",      icon: Circle,       color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  confirmed:            { label: "Confirmado",     icon: CheckCircle2, color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  rejected:             { label: "Rechazado",      icon: Circle,       color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  stock_reserved:       { label: "Stock reservado", icon: Package,     color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  in_preparation:       { label: "En preparación",  icon: Package,     color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  ready_to_dispatch:    { label: "Listo",          icon: Package,      color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  dispatched:           { label: "Despachado",     icon: Truck,        color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  delivered:            { label: "Entregado",      icon: CheckCircle2, color: "bg-p3/15 text-p3 dark:text-p2" },
  completed:            { label: "Completado",     icon: CheckCircle2, color: "bg-p3/15 text-p3 dark:text-p2" },
  cancelled:            { label: "Cancelado",      icon: Circle,       color: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

const CHANNEL_OPTIONS = [
  { label: "Manual", value: "manual" },
  { label: "Portal", value: "portal" },
  { label: "WhatsApp", value: "whatsapp" },
];

interface Props {
  customerId: string;
}

export function CustomerOrdersTab({ customerId }: Props) {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const statusOptions = React.useMemo(
    () => (Object.keys(statusConfig) as OrderStatus[]).map((s) => ({
      label: statusConfig[s].label,
      value: s,
      icon: statusConfig[s].icon,
    })),
    [],
  );

  const columns = React.useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: "number",
        accessorKey: "number",
        header: ({ column }) => <DataTableColumnHeader column={column} label="#" />,
        cell: ({ row }) => {
          const o = row.original;
          const display = o.number > 0 ? String(o.number) : o.id.slice(0, 8);
          return (
            <Link href={`/pedidos/${o.number}`} className="font-mono text-xs text-muted-foreground hover:text-foreground">
              {display}
            </Link>
          );
        },
        meta: { label: "#", icon: Hash },
        size: 100,
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => {
          const d = new Date(row.original.createdAt);
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap inline-flex items-center gap-1">
              <Clock className="size-3" />
              {d.toLocaleString("es-AR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          );
        },
        meta: { label: "Fecha", variant: "dateRange" },
        enableColumnFilter: true,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Estado" />,
        cell: ({ row }) => {
          const cfg = statusConfig[row.original.status];
          const Icon = cfg?.icon ?? Circle;
          return (
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 whitespace-nowrap", cfg?.color)}>
              <Icon className="size-3" />
              {cfg?.label ?? row.original.status}
            </span>
          );
        },
        meta: { label: "Estado", variant: "multiSelect", options: statusOptions, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "channel",
        accessorKey: "channel",
        header: "Canal",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.channel ?? "—"}</span>,
        meta: { label: "Canal", variant: "multiSelect", options: CHANNEL_OPTIONS },
        enableColumnFilter: true,
      },
      {
        id: "items",
        accessorFn: (row) => row.itemCount ?? row.items?.length ?? 0,
        header: "Productos",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.itemCount ?? row.original.items?.length ?? 0} productos
          </span>
        ),
        meta: { label: "Productos" },
      },
      {
        id: "total",
        accessorKey: "total",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Total" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm font-semibold block">
            {formatMoney(Number(row.original.total))}
          </span>
        ),
        meta: { label: "Total", variant: "range", icon: DollarSign },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => (
          <div className="text-right">
            <Link href={`/pedidos/${row.original.number}`}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ChevronRight className="size-4" />
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [statusOptions],
  );

  const { table } = useDataTable({
    data: orders,
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

  const summaryParams = React.useMemo(() => {
    const p = new URLSearchParams(filterParams);
    p.delete("page"); p.delete("limit"); p.delete("sort");
    p.set("customerId", customerId);
    return p.toString();
  }, [filterParams, customerId]);

  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(filterParams);
    params.set("customerId", customerId);
    getOrdersQuery(params.toString())
      .then((r) => {
        setOrders(r.items);
        setPageCount(r.meta.totalPages);
        setTotalRows(r.meta.total);
      })
      .finally(() => setLoading(false));
  }, [filterParams, customerId]);

  React.useEffect(() => {
    getOrdersSummary(summaryParams)
      .then((s) => setTotalAmount(s.totalAmount))
      .catch(() => setTotalAmount(0));
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (o) => [
    o.number > 0 ? String(o.number) : o.id.slice(0, 8),
    new Date(o.createdAt).toLocaleDateString("es-AR"),
    statusConfig[o.status]?.label ?? o.status,
    o.channel ?? "",
    String(o.itemCount ?? o.items?.length ?? 0),
    String(Number(o.total)),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalRows} pedidos · Total: {formatMoney(totalAmount)}
        </p>
      </div>
      <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
        <ExportButton
          headers={["#", "Fecha", "Estado", "Canal", "Productos", "Total"]}
          {...exportRows}
          filename={`pedidos-${customerId.slice(0, 8)}`}
        />
      </ERPDataTable>
    </div>
  );
}
