"use server";

import * as reportsApi from "@/lib/api/endpoints/reports";
import * as ordersApi from "@/lib/api/endpoints/orders";
import type {
  SalesByPeriodItem,
  OrdersByStatusItem,
  CriticalStockItem,
  CustomerDebtItem,
  TopProductItem,
} from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────

export interface DashboardStats {
  ordersToday: number;
  ordersVariation: number;
  billedMonth: number;
  monthTarget: number;
  pendingCollections: number;
  lowStockAlerts: number;
  pendingOrders: number;
  grossMarginMonth: number;
  overdueCustomers: number;
}

export interface DailySales {
  date: string;
  amount: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  totalAmount: number;
}

// ─── Actions ────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  // Include yesterday even if it's in the previous month (for variation calc)
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const queryFrom = yesterdayDate < monthStart ? yesterdayDate : monthStart;

  const [salesData, orderStatusData, stockData, debtData, marginData] = await Promise.all([
    reportsApi.salesByPeriod({ from: queryFrom, to: today }).catch(() => []),
    reportsApi.ordersByStatus().catch(() => []),
    reportsApi.criticalStock().catch(() => []),
    reportsApi.customerDebt().catch(() => []),
    reportsApi.grossMargin({ from: monthStart, to: today }).catch(() => ({ margin: 0 })),
  ]);

  const sales = (salesData ?? []) as SalesByPeriodItem[];
  const orderStatus = (orderStatusData ?? []) as OrdersByStatusItem[];
  const stock = (stockData ?? []) as CriticalStockItem[];
  const debt = (debtData ?? []) as CustomerDebtItem[];

  const todayEntry = sales.find((s) => s.date === today);
  const ordersToday = Number(todayEntry?.count ?? 0);
  const billedMonth = sales
    .filter((s) => s.date >= monthStart)
    .reduce((sum, s) => sum + Number(s.total), 0);

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const yesterdayEntry = sales.find((s) => s.date === yesterday);
  const ordersYesterday = Number(yesterdayEntry?.count ?? 0);
  const ordersVariation = ordersYesterday > 0
    ? ((ordersToday - ordersYesterday) / ordersYesterday) * 100
    : ordersToday > 0 ? 100 : 0;

  const pendingEntry = orderStatus.find(
    (s) => s.status === "pending_confirmation"
  );
  const pendingOrders = Number(pendingEntry?.count ?? 0);

  const pendingCollections = debt.reduce(
    (sum, d) => sum + Number(d.balance),
    0
  );
  const overdueCustomers = debt.filter(
    (d) => Number(d.overdueBalance) > 0
  ).length;

  return {
    ordersToday,
    ordersVariation,
    billedMonth,
    monthTarget: 0,
    pendingCollections,
    lowStockAlerts: stock.length,
    pendingOrders,
    grossMarginMonth: (marginData as { margin: number })?.margin ?? 0,
    overdueCustomers,
  };
}

export async function getSalesLast30Days(params?: {
  from?: string;
  to?: string;
}): Promise<DailySales[]> {
  const to = params?.to ?? new Date().toISOString().slice(0, 10);
  const from =
    params?.from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const data = await reportsApi.salesByPeriod({ from, to });
  const items = (data ?? []) as SalesByPeriodItem[];
  return items
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      amount: Number(d.total),
    }));
}

export async function getTopProducts(
  limit = 5,
  params?: { from?: string; to?: string }
): Promise<TopProduct[]> {
  const to = params?.to ?? new Date().toISOString().slice(0, 10);
  const from =
    params?.from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const data = await reportsApi.topProducts({ limit, from, to });
  const items = (data ?? []) as TopProductItem[];
  return items.map((d) => ({
    productId: d.productId,
    name: d.productName ?? d.productSku ?? 'Producto sin nombre',
    quantitySold: Number(d.totalQty),
    totalAmount: Number(d.totalRevenue),
  }));
}

export async function getPendingOrders() {
  return ordersApi.getAll({
    status: "pending_confirmation",
    limit: 20,
    sort: "createdAt",
    order: "asc",
  });
}

export async function getTopDebtors(limit = 5) {
  const data = await reportsApi.customerDebt({ limit });
  return (data ?? []) as CustomerDebtItem[];
}
