"use server";

import * as reportsApi from "@/lib/api/endpoints/reports";
import type {
  SalesByPeriodItem,
  CustomerDebtItem,
} from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────

export interface SalesReport {
  period: string;
  amount: number;
  count: number;
}

export interface ProfitabilityReport {
  product: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPercent: number;
}

export interface AgingReport {
  range: string;
  amount: number;
  count: number;
  color: string;
}

// ─── Actions ────────────────────────────────────────────────

export async function getMonthlySalesReport(params?: {
  from?: string;
  to?: string;
}): Promise<SalesReport[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const from = params?.from ?? sixMonthsAgo.toISOString().slice(0, 10);
  const to = params?.to ?? new Date().toISOString().slice(0, 10);

  const data = await reportsApi.salesByPeriod({ from, to });
  const items = (data ?? []) as SalesByPeriodItem[];

  // Group by month
  const byMonth: Record<string, { amount: number; count: number }> = {};
  for (const item of items) {
    const month = item.date.slice(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = { amount: 0, count: 0 };
    byMonth[month].amount += Number(item.total);
    byMonth[month].count += Number(item.count);
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      amount: data.amount,
      count: data.count,
    }));
}

export async function getProfitabilityReport(params?: {
  from?: string;
  to?: string;
}): Promise<ProfitabilityReport[]> {
  const data = await reportsApi.profitabilityByProduct(params).catch(() => null);
  const items = (data ?? []) as Array<{
    productName?: string;
    productSku?: string;
    revenue?: number | string;
    cost?: number | string;
    margin?: number | string;
  }>;
  return items.map((d) => {
    const revenue = Number(d.revenue ?? 0);
    const costs = Number(d.cost ?? 0);
    const margin = Number(d.margin ?? 0);
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;
    return {
      product: d.productName ?? d.productSku ?? "Producto eliminado",
      revenue,
      costs,
      margin,
      marginPercent,
    };
  });
}

export async function getAgingReport(): Promise<AgingReport[]> {
  const data = await reportsApi.customerDebt({ limit: 100 });
  const items = (data ?? []) as CustomerDebtItem[];

  if (items.length === 0) return [];

  const now = Date.now();
  const buckets: Record<string, { amount: number; count: number }> = {
    "Al día": { amount: 0, count: 0 },
    "15-30 días": { amount: 0, count: 0 },
    "30-60 días": { amount: 0, count: 0 },
    "60+ días": { amount: 0, count: 0 },
  };

  const colors: Record<string, string> = {
    "Al día": "#22c55e",
    "15-30 días": "#f59e0b",
    "30-60 días": "#f97316",
    "60+ días": "#ef4444",
  };

  for (const item of items) {
    const overdueAmt = Number(item.overdueBalance);
    const balanceAmt = Number(item.balance);
    if (overdueAmt > 0) {
      // Approximate bucketing based on overdue ratio
      const overdueRatio = overdueAmt / Math.max(balanceAmt, 1);
      if (overdueRatio > 0.5) {
        buckets["60+ días"].amount += balanceAmt;
        buckets["60+ días"].count += 1;
      } else if (overdueRatio > 0.25) {
        buckets["30-60 días"].amount += balanceAmt;
        buckets["30-60 días"].count += 1;
      } else {
        buckets["15-30 días"].amount += balanceAmt;
        buckets["15-30 días"].count += 1;
      }
    } else {
      buckets["Al día"].amount += balanceAmt;
      buckets["Al día"].count += 1;
    }
  }

  return Object.entries(buckets)
    .map(([range, v]) => ({
      range,
      amount: v.amount,
      count: v.count,
      color: colors[range] ?? "#94a3b8",
    }));
}

export async function getOrdersByStatus(
  params?: Record<string, string | number | undefined>
) {
  return reportsApi.ordersByStatus(params);
}

export async function getCriticalStock(
  params?: Record<string, string | number | undefined>
) {
  return reportsApi.criticalStock(params);
}

export async function getCustomerDebtReport(
  params?: Record<string, string | number | undefined>
) {
  return reportsApi.customerDebt(params);
}

export async function getTopCustomers(
  params?: Record<string, string | number | undefined>
) {
  return reportsApi.topCustomers(params);
}

export interface TopCustomerReportItem {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalSpent: number;
}

export async function getTopCustomersReport(
  params?: { limit?: number; from?: string; to?: string }
): Promise<TopCustomerReportItem[]> {
  const data = await reportsApi.topCustomers(params).catch(() => []);
  const items = (data ?? []) as Array<{
    customerId: string;
    customerName?: string;
    orderCount: number | string;
    totalSpent: number | string;
  }>;
  return items.map((item) => ({
    customerId: item.customerId,
    customerName: item.customerName ?? "Cliente eliminado",
    orderCount: Number(item.orderCount ?? 0),
    totalSpent: Number(item.totalSpent ?? 0),
  }));
}

export interface OrdersByStatusReportItem {
  status: string;
  count: number;
}

export async function getOrdersByStatusReport(): Promise<OrdersByStatusReportItem[]> {
  const data = await reportsApi.ordersByStatus().catch(() => []);
  const items = (data ?? []) as Array<{ status: string; count: number | string }>;
  return items.map((item) => ({
    status: item.status,
    count: Number(item.count ?? 0),
  }));
}

export interface GrossMarginSummary {
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
}

export async function getGrossMarginSummary(
  params?: { from?: string; to?: string }
): Promise<GrossMarginSummary> {
  const result = await reportsApi.grossMargin(params).catch(() => null);
  if (!result) return { revenue: 0, cost: 0, margin: 0, marginPercent: 0 };
  const revenue = Number(result.revenue ?? 0);
  const cost = Number(result.cost ?? 0);
  const margin = revenue - cost;
  // Backend `margin` is already rounded percentage; fall back to compute.
  const marginPercent =
    result.margin != null
      ? Number(result.margin)
      : revenue > 0
        ? (margin / revenue) * 100
        : 0;
  return { revenue, cost, margin, marginPercent };
}

// Fase 7
export async function getSalesBySeller(params?: Record<string, string | number | undefined>) { return reportsApi.salesBySeller(params); }
export async function getSalesByZone(params?: Record<string, string | number | undefined>) { return reportsApi.salesByZone(params); }
export async function getSalesByChannel(params?: Record<string, string | number | undefined>) { return reportsApi.salesByChannel(params); }
export async function getProfitabilityByProduct(params?: Record<string, string | number | undefined>) { return reportsApi.profitabilityByProduct(params); }
export async function getProfitabilityByCustomer(params?: Record<string, string | number | undefined>) { return reportsApi.profitabilityByCustomer(params); }
export async function getStockRotation(params?: Record<string, string | number | undefined>) { return reportsApi.stockRotation(params); }
export async function getOnTimeDelivery(params?: Record<string, string | number | undefined>) { return reportsApi.onTimeDelivery(params); }
export async function getFillRate(params?: Record<string, string | number | undefined>) { return reportsApi.fillRate(params); }
export async function getPickingThroughput(params?: Record<string, string | number | undefined>) { return reportsApi.pickingThroughput(params); }
export async function getAging(params?: Record<string, string | number | undefined>) { return reportsApi.aging(params); }
export async function getCashFlowProjection(params?: Record<string, string | number | undefined>) { return reportsApi.cashFlowProjection(params); }
export async function getCheckPortfolio(params?: Record<string, string | number | undefined>) { return reportsApi.checkPortfolio(params); }
export async function getReturnsByReason(params?: Record<string, string | number | undefined>) { return reportsApi.returnsByReason(params); }
export async function getThreeWayMatchDiscrepancies(params?: Record<string, string | number | undefined>) { return reportsApi.threeWayMatchDiscrepancies(params); }
