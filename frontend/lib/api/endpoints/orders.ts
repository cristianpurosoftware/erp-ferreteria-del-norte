import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Order } from "@/lib/types";

export interface OrdersSummary {
  total: number;
  totalAmount: number;
  byStatus: Record<string, number>;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<Order>> {
  return fetchPaginated<Order>("/orders", params);
}

export async function getSummary(query?: string): Promise<OrdersSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<OrdersSummary>(`/orders/summary${suffix}`);
}

export async function getById(id: string): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}`);
}

export async function create(data: unknown): Promise<Order> {
  return fetchApi<Order>("/orders", { method: "POST", body: data });
}

export async function update(id: string, data: unknown): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}`, { method: "PUT", body: data });
}

// ─── Workflow actions ────────────────────────────────────────

export async function submit(id: string): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}/submit`, { method: "POST" });
}

export async function confirm(id: string): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}/confirm`, { method: "POST" });
}

export async function reject(id: string): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}/reject`, { method: "POST" });
}

export async function reserveStock(id: string): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}/reserve-stock`, { method: "POST" });
}

export async function startPreparation(id: string): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}/start-preparation`, { method: "POST" });
}

export async function readyToDispatch(id: string): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}/ready-to-dispatch`, { method: "POST" });
}

export async function dispatch(id: string): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}/dispatch`, { method: "POST" });
}

export async function deliver(id: string): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}/deliver`, { method: "POST" });
}

export async function complete(id: string): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}/complete`, { method: "POST" });
}

export async function cancel(id: string): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}/cancel`, { method: "POST" });
}
