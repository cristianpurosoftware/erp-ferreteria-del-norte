import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { SalesZone } from "@/lib/types";

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<SalesZone>> {
  return fetchPaginated<SalesZone>("/sales-zones", params);
}

export async function getById(id: string): Promise<SalesZone> {
  return fetchApi<SalesZone>(`/sales-zones/${id}`);
}

export async function create(data: unknown): Promise<SalesZone> {
  return fetchApi<SalesZone>("/sales-zones", { method: "POST", body: data });
}

export async function update(id: string, data: unknown): Promise<SalesZone> {
  return fetchApi<SalesZone>(`/sales-zones/${id}`, { method: "PUT", body: data });
}

export async function remove(id: string): Promise<void> {
  return fetchApi<void>(`/sales-zones/${id}`, { method: "DELETE" });
}
