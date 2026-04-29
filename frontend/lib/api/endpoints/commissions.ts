import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Commission } from "@/lib/types";

export interface CommissionsSummary {
  total: number;
  totalAmount: number;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<Commission>> {
  return fetchPaginated<Commission>("/commissions", params);
}

export async function getSummary(query?: string): Promise<CommissionsSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<CommissionsSummary>(`/commissions/summary${suffix}`);
}

export async function getById(id: string): Promise<Commission> {
  return fetchApi<Commission>(`/commissions/${id}`);
}

export async function approve(id: string): Promise<Commission> {
  return fetchApi<Commission>(`/commissions/${id}/approve`, { method: "POST" });
}

export async function reverse(id: string): Promise<Commission> {
  return fetchApi<Commission>(`/commissions/${id}/reverse`, { method: "POST" });
}
