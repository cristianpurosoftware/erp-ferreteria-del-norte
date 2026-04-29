import { fetchApi } from "../client";

export async function salesByPeriod(params?: Record<string, string | number | undefined>) {
  return fetchApi<unknown>("/reports/sales", { params });
}

export async function ordersByStatus(params?: Record<string, string | number | undefined>) {
  return fetchApi<unknown>("/reports/orders-by-status", { params });
}

export async function criticalStock(params?: Record<string, string | number | undefined>) {
  return fetchApi<unknown>("/reports/critical-stock", { params });
}

export async function customerDebt(params?: Record<string, string | number | undefined>) {
  return fetchApi<unknown>("/reports/customer-debt", { params });
}

export async function topProducts(params?: Record<string, string | number | undefined>) {
  return fetchApi<unknown>("/reports/top-products", { params });
}

export async function topCustomers(params?: Record<string, string | number | undefined>) {
  return fetchApi<unknown>("/reports/top-customers", { params });
}

export async function grossMargin(params?: Record<string, string | number | undefined>) {
  return fetchApi<{ revenue: number; cost: number; margin: number }>("/reports/gross-margin", { params });
}

export async function pendingCollections(params?: Record<string, string | number | undefined>) {
  return fetchApi<unknown>("/reports/pending-collections", { params });
}

// Fase 7
export async function salesBySeller(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/sales-by-seller", { params }); }
export async function salesByZone(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/sales-by-zone", { params }); }
export async function salesByChannel(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/sales-by-channel", { params }); }
export async function profitabilityByProduct(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/profitability/by-product", { params }); }
export async function profitabilityByCustomer(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/profitability/by-customer", { params }); }
export async function stockRotation(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/stock-rotation", { params }); }
export async function onTimeDelivery(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/logistics/on-time-delivery", { params }); }
export async function fillRate(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/logistics/fill-rate", { params }); }
export async function pickingThroughput(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/logistics/picking-throughput", { params }); }
export async function aging(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/aging", { params }); }
export async function cashFlowProjection(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/cash-flow/projection", { params }); }
export async function checkPortfolio(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/check-portfolio", { params }); }
export async function returnsByReason(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/returns-by-reason", { params }); }
export async function threeWayMatchDiscrepancies(params?: Record<string, string | number | undefined>) { return fetchApi<unknown>("/reports/three-way-match-discrepancies", { params }); }
