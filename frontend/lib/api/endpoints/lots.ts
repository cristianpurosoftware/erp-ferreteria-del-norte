import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Lot, StockByLot } from "@/lib/types";

export interface LotsSummary {
  total: number;
  byStatus: Record<string, number>;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<Lot>> {
  return fetchPaginated<Lot>("/lots", params);
}

export async function getSummary(query?: string): Promise<LotsSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<LotsSummary>(`/lots/summary${suffix}`);
}

export async function getById(id: string): Promise<Lot> {
  return fetchApi<Lot>(`/lots/${id}`);
}

export async function create(data: unknown): Promise<Lot> {
  return fetchApi<Lot>("/lots", { method: "POST", body: data });
}

export async function block(id: string): Promise<Lot> {
  return fetchApi<Lot>(`/lots/${id}/block`, { method: "POST" });
}

export async function unblock(id: string): Promise<Lot> {
  return fetchApi<Lot>(`/lots/${id}/unblock`, { method: "POST" });
}

export async function expiring(days: number = 30): Promise<Lot[]> {
  return fetchApi<Lot[]>(`/lots/expiring`, { params: { days } });
}

export async function stockByLot(params?: {
  productId?: string;
  warehouseId?: string;
}): Promise<StockByLot[]> {
  return fetchApi<StockByLot[]>("/lots/stock-by-lot", {
    params: params as Record<string, string | undefined>,
  });
}

export async function runExpireJob(): Promise<{ expired: number }> {
  return fetchApi<{ expired: number }>("/lots/expire-job", {
    method: "POST",
  });
}
