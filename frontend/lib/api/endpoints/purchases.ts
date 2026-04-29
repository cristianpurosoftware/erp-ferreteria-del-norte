import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { PurchaseOrder, PurchaseReception } from "@/lib/types";

export interface PurchasesSummary {
  total: number;
  totalAmount: number;
}

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<PurchaseOrder>> {
  return fetchPaginated<PurchaseOrder>("/purchases", params);
}

export async function getSummary(query?: string): Promise<PurchasesSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<PurchasesSummary>(`/purchases/summary${suffix}`);
}

export async function getById(id: string): Promise<PurchaseOrder> {
  return fetchApi<PurchaseOrder>(`/purchases/${id}`);
}

export async function create(data: unknown): Promise<PurchaseOrder> {
  return fetchApi<PurchaseOrder>("/purchases", { method: "POST", body: data });
}

export async function update(id: string, data: unknown): Promise<PurchaseOrder> {
  return fetchApi<PurchaseOrder>(`/purchases/${id}`, { method: "PUT", body: data });
}

export async function approve(id: string): Promise<PurchaseOrder> {
  return fetchApi<PurchaseOrder>(`/purchases/${id}/approve`, { method: "POST" });
}

export async function send(id: string): Promise<PurchaseOrder> {
  return fetchApi<PurchaseOrder>(`/purchases/${id}/send`, { method: "POST" });
}

export async function receive(id: string): Promise<PurchaseOrder> {
  return fetchApi<PurchaseOrder>(`/purchases/${id}/receive`, { method: "POST" });
}

export async function cancel(id: string): Promise<PurchaseOrder> {
  return fetchApi<PurchaseOrder>(`/purchases/${id}/cancel`, { method: "POST" });
}

export async function createReception(id: string, data: unknown): Promise<PurchaseReception> {
  return fetchApi<PurchaseReception>(`/purchases/${id}/receptions`, { method: "POST", body: data });
}
