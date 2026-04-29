import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { WarehouseLocation } from "@/lib/types";

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<WarehouseLocation>> {
  return fetchPaginated<WarehouseLocation>("/warehouse-locations", params);
}

export async function getById(id: string): Promise<WarehouseLocation> {
  return fetchApi<WarehouseLocation>(`/warehouse-locations/${id}`);
}

export async function create(data: unknown): Promise<WarehouseLocation> {
  return fetchApi<WarehouseLocation>("/warehouse-locations", {
    method: "POST",
    body: data,
  });
}

export async function update(
  id: string,
  data: unknown
): Promise<WarehouseLocation> {
  return fetchApi<WarehouseLocation>(`/warehouse-locations/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function remove(id: string): Promise<void> {
  return fetchApi<void>(`/warehouse-locations/${id}`, { method: "DELETE" });
}
