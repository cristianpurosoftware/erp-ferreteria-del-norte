import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { InventoryCount } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<InventoryCount>> {
  return fetchPaginated<InventoryCount>("/inventory-counts", params);
}
export async function getById(id: string): Promise<InventoryCount> {
  return fetchApi<InventoryCount>(`/inventory-counts/${id}`);
}
export async function create(data: unknown): Promise<InventoryCount> {
  return fetchApi<InventoryCount>("/inventory-counts", { method: "POST", body: data });
}
export async function start(id: string): Promise<InventoryCount> {
  return fetchApi<InventoryCount>(`/inventory-counts/${id}/start`, { method: "POST" });
}
export async function addLines(id: string, data: { lines: Array<{ productId: string; lotId?: string; locationId?: string; systemQty?: number; countedQty?: number; reasonCode?: string }> }): Promise<InventoryCount> {
  return fetchApi<InventoryCount>(`/inventory-counts/${id}/lines`, { method: "POST", body: data });
}
export async function approve(id: string): Promise<InventoryCount> {
  return fetchApi<InventoryCount>(`/inventory-counts/${id}/approve`, { method: "POST" });
}
export async function apply(id: string): Promise<InventoryCount> {
  return fetchApi<InventoryCount>(`/inventory-counts/${id}/apply`, { method: "POST" });
}
export async function cancel(id: string): Promise<InventoryCount> {
  return fetchApi<InventoryCount>(`/inventory-counts/${id}/cancel`, { method: "POST" });
}
export async function recreateFromStock(id: string): Promise<InventoryCount> {
  return fetchApi<InventoryCount>(`/inventory-counts/${id}/recreate-from-stock`, { method: "POST" });
}
