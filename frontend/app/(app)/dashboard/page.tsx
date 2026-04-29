"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Plus, ShoppingCart, DollarSign, AlertTriangle, TrendingUp, Package, Users } from "lucide-react";
import Link from "next/link";
import {
  getDashboardStats,
  getSalesLast30Days,
  getTopProducts,
  getPendingOrders,
  getTopDebtors,
  type DashboardStats,
  type DailySales,
  type TopProduct,
} from "@/lib/actions/dashboard";
import { getLowStock } from "@/lib/actions/inventory";
import type { Order, Stock } from "@/lib/types";
import { formatMoney, formatMoneyShort, getGreeting, formatPercent } from "@/lib/format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  BarChart,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const statusColors: Record<string, string> = {
  draft:                "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  pending_confirmation: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  confirmed:            "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  in_preparation:       "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  dispatched:           "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  delivered:            "bg-p3/15 text-p3 dark:text-p2",
  completed:            "bg-p3/15 text-p3 dark:text-p2",
};

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  pending_confirmation: "Pendiente",
  confirmed: "Confirmado",
  in_preparation: "En preparación",
  ready_to_dispatch: "Listo",
  dispatched: "Despachado",
  delivered: "Entregado",
  completed: "Completado",
  cancelled: "Cancelado",
};

function WelcomeSection({ stats }: { stats: DashboardStats | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
          {getGreeting()}
          <PageHelpTooltip content={SCREEN_HELP.dashboard} />
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {stats?.ordersToday ?? 0} pedidos hoy &middot; {stats?.pendingOrders ?? 0} pendientes
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-9 gap-1.5 bg-primary hover:bg-primary/90" asChild>
          <Link href="/pedidos">
            <Plus className="size-4" />
            Nuevo Pedido
          </Link>
        </Button>
      </div>
    </div>
  );
}

function KPICards({ stats }: { stats: DashboardStats | null }) {
  const s = stats ?? { ordersToday: 0, ordersVariation: 0, billedMonth: 0, monthTarget: 1, pendingCollections: 0, overdueCustomers: 0, lowStockAlerts: 0, pendingOrders: 0, grossMarginMonth: 0 };
  const kpiCards = [
    { title: "Pedidos hoy", value: s.ordersToday.toString(), subtitle: `${formatPercent(s.ordersVariation)} vs ayer`, icon: ShoppingCart, color: "text-p3", bgColor: "bg-p3/10", href: "/pedidos" },
    { title: "Facturado (mes)", value: formatMoneyShort(s.billedMonth), subtitle: s.monthTarget > 0 ? `Obj: ${formatMoneyShort(s.monthTarget)} (${Math.round((s.billedMonth / s.monthTarget) * 100)}%)` : `${s.ordersToday} pedidos hoy`, icon: DollarSign, color: "text-p3", bgColor: "bg-p3/10", href: "/reportes" },
    { title: "Cobranzas pend.", value: formatMoneyShort(s.pendingCollections), subtitle: `${s.overdueCustomers} clientes > 30 días`, icon: TrendingUp, color: "text-p5 dark:text-p2", bgColor: "bg-p5/10 dark:bg-p3/20", href: "/cobranzas" },
    { title: "Alertas stock", value: s.lowStockAlerts.toString(), subtitle: "productos bajo mínimo", icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-500/10", href: "/stock" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((card) => (
        <Link
          key={card.title}
          href={card.href}
          className="rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className="text-2xl font-semibold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </div>
            <div className={cn("flex size-10 items-center justify-center rounded-lg shrink-0", card.bgColor)}>
              <card.icon className={cn("size-5", card.color)} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function SalesChart({ salesData, grossMargin }: { salesData: DailySales[]; grossMargin: number }) {
  const chartData = salesData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
    amount: d.amount,
  }));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-medium text-base">Ventas últimos 30 días</h3>
        <span className="text-xs text-muted-foreground">
          Margen bruto: {grossMargin}%
        </span>
      </div>
      <div className="p-4">
        <ChartContainer config={{ amount: { label: "Ventas" } }} className="h-[200px] w-full">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={4} />
            <YAxis hide domain={[0, "auto"]} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value))} />} />
            <Line type="monotone" dataKey="amount" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }} />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function TopProductsChart({ topProducts }: { topProducts: TopProduct[] }) {
  const barColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-medium text-base">Top 5 productos</h3>
        <Link href="/reportes" className="text-xs text-muted-foreground hover:text-foreground">Ver todos</Link>
      </div>
      <div className="p-4">
        <ChartContainer config={{ quantitySold: { label: "Unidades" } }} className="h-[200px] w-full">
          <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={130} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="quantitySold" radius={[0, 4, 4, 0]}>
              {topProducts.map((_entry, index) => (
                <Cell key={index} fill={barColors[index]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function PendingOrdersList({ orders }: { orders: Order[] }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-medium text-base flex items-center gap-2">
          <Package className="size-4 text-blue-500" />
          Pedidos pendientes
          <span className="text-xs font-normal text-muted-foreground">({orders.length})</span>
        </h3>
        <Link href="/pedidos" className="text-xs text-muted-foreground hover:text-foreground">Ver todos</Link>
      </div>
      <div className="divide-y">
        {orders.slice(0, 6).map((order) => {
          const date = new Date(order.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
          return (
            <Link
              key={order.id}
              href={`/pedidos/${order.number}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">#{order.number} - {order.customerName ?? 'Pedido'}</p>
                <p className="text-xs text-muted-foreground">{order.itemCount ?? order.items?.length ?? 0} productos &middot; {date}</p>
              </div>
              <span className="text-sm font-medium tabular-nums">{formatMoney(order.total)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function LowStockAlerts({ stockItems }: { stockItems: Stock[] }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-medium text-base flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          Alertas de stock
        </h3>
        <Link href="/stock" className="text-xs text-muted-foreground hover:text-foreground">Ver stock</Link>
      </div>
      <div className="divide-y">
        {stockItems.slice(0, 6).map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
            <div>
              <p className="text-sm font-medium">{s.productName ?? s.productSku ?? "Producto eliminado"}</p>
              <p className="text-xs text-muted-foreground">Disponible: {s.availableQty} / Mín: {s.minStock}</p>
            </div>
            <span className={cn("text-xs px-2 py-1 rounded-full font-medium", s.availableQty === 0 ? "bg-red-500/10 text-red-600" : "bg-yellow-500/10 text-yellow-600")}>
              {s.availableQty === 0 ? "Sin stock" : "Bajo"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="size-10 rounded-lg shrink-0" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b"><Skeleton className="h-5 w-44" /></div>
            <div className="p-4"><Skeleton className="h-[200px] w-full rounded-lg" /></div>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b"><Skeleton className="h-5 w-32" /></div>
            <div className="p-4"><Skeleton className="h-[200px] w-full rounded-lg" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sales, setSales] = useState<DailySales[]>([]);
  const [topProds, setTopProds] = useState<TopProduct[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<Stock[]>([]);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getSalesLast30Days(),
      getTopProducts(),
      getPendingOrders(),
      getLowStock(),
    ]).then(([s, v, top, orders, stock]) => {
      setStats(s);
      setSales(v);
      setTopProds(top);
      setPendingOrders(orders.items);
      setLowStock(stock.items);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <WelcomeSection stats={stats} />
        <KPICards stats={stats} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <SalesChart salesData={sales} grossMargin={stats?.grossMarginMonth ?? 0} />
          </div>
          <div>
            <TopProductsChart topProducts={topProds} />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <PendingOrdersList orders={pendingOrders} />
          <LowStockAlerts stockItems={lowStock} />
        </div>
      </div>
    </div>
  );
}
