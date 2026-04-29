"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  Circle,
  ChevronRight,
  Hash,
  User,
  Tag,
  DollarSign,
  Calendar,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Order,
  OrderStatus,
  Customer,
  Product,
  SalesZone,
  Route,
} from "@/lib/types";
import { getOrdersQuery, getOrdersSummary } from "@/lib/actions/orders";
import { getCustomers } from "@/lib/actions/customers";
import { getActiveProducts } from "@/lib/actions/products";
import { getSalesZones } from "@/lib/actions/sales-zones";
import { getRoutes } from "@/lib/actions/routes";
import { OrderForm } from "@/components/forms/order-form";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

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

export default function PedidosPage() {
  const [newOrderOpen, setNewOrderOpen] = React.useState(false);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [zones, setZones] = React.useState<SalesZone[]>([]);
  const [routes, setRoutes] = React.useState<Route[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Reference data for form + cell labels — loaded once.
  React.useEffect(() => {
    Promise.all([
      getCustomers({ limit: 5000 }),
      getActiveProducts(),
      getSalesZones({ limit: 500 }),
      getRoutes({ limit: 500 }),
    ]).then(([c, p, z, r]) => {
      setCustomers(c.items);
      setProducts(p.items);
      setZones(z.items);
      setRoutes(r.items);
    });
  }, []);

  const statusOptions = React.useMemo(
    () => (Object.keys(statusConfig) as OrderStatus[]).map((s) => ({
      label: statusConfig[s].label,
      value: s,
      icon: statusConfig[s].icon,
    })),
    [],
  );

  const zoneOptions = React.useMemo(
    () => zones.map((z) => ({ label: z.code, value: z.id })),
    [zones],
  );

  const routeOptions = React.useMemo(
    () => routes.map((r) => ({ label: r.code, value: r.id })),
    [routes],
  );

  const columns = React.useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar cliente...", variant: "text" },
        enableColumnFilter: true,
      },
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
        id: "customerName",
        accessorFn: (row) => row.customerName ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cliente" />,
        cell: ({ row }) => (
          <Link href={`/pedidos/${row.original.number}`} className="text-sm font-medium hover:underline">
            {row.original.customerName ?? "Cliente eliminado"}
          </Link>
        ),
        meta: { label: "Cliente" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Estado" />,
        cell: ({ row }) => {
          const cfg = statusConfig[row.original.status];
          const Icon = cfg.icon;
          return (
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 whitespace-nowrap", cfg.color)}>
              <Icon className="size-3" />
              {cfg.label}
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
        id: "zoneId",
        accessorKey: "zoneId",
        header: "Zona",
        cell: ({ row }) => {
          const z = zones.find((x) => x.id === row.original.zoneId);
          return <span className="text-sm text-muted-foreground">{z?.code ?? "—"}</span>;
        },
        meta: { label: "Zona", variant: "multiSelect", options: zoneOptions },
        enableColumnFilter: true,
      },
      {
        id: "routeId",
        accessorKey: "routeId",
        header: "Ruta",
        cell: ({ row }) => {
          const r = routes.find((x) => x.id === row.original.routeId);
          return <span className="text-sm text-muted-foreground">{r?.code ?? "—"}</span>;
        },
        meta: { label: "Ruta", variant: "multiSelect", options: routeOptions },
        enableColumnFilter: true,
      },
      {
        id: "items",
        accessorFn: (row) => row.itemCount ?? row.items?.length ?? 0,
        header: "Productos",
        cell: ({ row }) => {
          const o = row.original;
          return <span className="text-sm text-muted-foreground">{o.itemCount ?? o.items?.length ?? 0} productos</span>;
        },
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
        meta: { label: "Total", icon: DollarSign },
        sortingFn: (a, b) => Number(a.original.total) - Number(b.original.total),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt);
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap inline-flex items-center gap-1">
              <Clock className="size-3" />
              {date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          );
        },
        meta: { label: "Fecha", icon: Calendar },
        sortingFn: (a, b) => new Date(a.original.createdAt).getTime() - new Date(b.original.createdAt).getTime(),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="text-right">
            <Link href={`/pedidos/${row.original.number}`}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ChevronRight className="size-4" />
              </Button>
            </Link>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 48,
      },
    ],
    [zones, routes, statusOptions, zoneOptions, routeOptions],
  );

  const { table } = useDataTable({
    data: orders,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false, zoneId: false, routeId: false },
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

  // Extract just the filter part (no page/limit/sort) for the summary query.
  const summaryParams = React.useMemo(() => {
    const p = new URLSearchParams(filterParams);
    p.delete("page");
    p.delete("limit");
    p.delete("sort");
    return p.toString();
  }, [filterParams]);

  const initialLoadDone = React.useRef(false);
  const fetchPageRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getOrdersQuery(filterParams)
      .then((r) => {
        setOrders(r.items);
        setPageCount(r.meta.totalPages);
        setTotalRows(r.meta.total);
      })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getOrdersSummary(summaryParams)
      .then((s) => setTotalAmount(s.totalAmount))
      .catch(() => setTotalAmount(0));
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (o) => [
    o.number > 0 ? String(o.number) : o.id.slice(0, 8),
    o.customerName ?? "",
    statusConfig[o.status]?.label ?? o.status,
    o.channel ?? "",
    String(o.itemCount ?? o.items?.length ?? 0),
    String(Number(o.total)),
    new Date(o.createdAt).toLocaleDateString("es-AR"),
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <ShoppingCart className="size-6 text-p3" />
                Pedidos
                <PageHelpTooltip content={SCREEN_HELP.pedidos} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalRows} pedidos · Total: {formatMoney(totalAmount)}
              </p>
            </div>
            <Button size="sm" className="h-9 gap-1.5" onClick={() => setNewOrderOpen(true)}>
              <Plus className="size-4" />
              Nuevo Pedido
            </Button>
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
            <ExportButton
              headers={["#", "Cliente", "Estado", "Canal", "Productos", "Total", "Fecha"]}
              {...exportRows}
              filename="pedidos"
            />
          </ERPDataTable>
        </div>
      </div>

      <OrderForm
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        customers={customers.map((c) => ({
          id: c.id,
          legalName: c.legalName,
          commercialName: c.commercialName,
          zoneId: c.zoneId,
          routeId: c.routeId,
          channel: c.channel,
          category: c.category,
        }))}
        products={products.map((p) => ({ id: p.id, name: p.name, basePrice: p.basePrice }))}
        zones={zones.map((z) => ({ id: z.id, code: z.code, name: z.name }))}
        routes={routes.map((r) => ({ id: r.id, code: r.code, name: r.name, zoneId: r.zoneId }))}
      />
    </>
  );
}
