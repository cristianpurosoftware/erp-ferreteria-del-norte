import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Stock, StockMovement } from "@/lib/types";

export interface MovementsSummary {
  total: number;
  inbound: number;
  outbound: number;
}

export async function getStock(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<Stock>> {
  return fetchPaginated<Stock>("/inventory/stock", params);
}

export async function getMovements(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<StockMovement>> {
  return fetchPaginated<StockMovement>("/inventory/movements", params);
}

export async function getMovementsSummary(query?: string): Promise<MovementsSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<MovementsSummary>(`/inventory/movements/summary${suffix}`);
}

export async function createMovement(data: unknown): Promise<StockMovement> {
  return fetchApi<StockMovement>("/inventory/movements", { method: "POST", body: data });
}

export async function adjustStock(data: unknown): Promise<void> {
  return fetchApi<void>("/inventory/adjustments", { method: "POST", body: data });
}

export async function transferStock(data: unknown): Promise<void> {
  return fetchApi<void>("/inventory/transfers", { method: "POST", body: data });
}
