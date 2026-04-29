import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { ReturnOrder } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<ReturnOrder>> {
  return fetchPaginated<ReturnOrder>("/returns", params);
}
export async function getById(id: string): Promise<ReturnOrder> {
  return fetchApi<ReturnOrder>(`/returns/${id}`);
}
export async function create(data: unknown): Promise<ReturnOrder> {
  return fetchApi<ReturnOrder>("/returns", { method: "POST", body: data });
}
export async function confirm(id: string): Promise<ReturnOrder> {
  return fetchApi<ReturnOrder>(`/returns/${id}/confirm`, { method: "POST" });
}
export async function receive(id: string): Promise<ReturnOrder> {
  return fetchApi<ReturnOrder>(`/returns/${id}/receive`, { method: "POST" });
}
export async function inspect(id: string, data: { lines: Array<{ itemId: string; condition: string; destLocationId?: string }> }): Promise<ReturnOrder> {
  return fetchApi<ReturnOrder>(`/returns/${id}/inspect`, { method: "POST", body: data });
}
export async function close(id: string): Promise<ReturnOrder> {
  return fetchApi<ReturnOrder>(`/returns/${id}/close`, { method: "POST" });
}
export async function cancel(id: string): Promise<ReturnOrder> {
  return fetchApi<ReturnOrder>(`/returns/${id}/cancel`, { method: "POST" });
}
