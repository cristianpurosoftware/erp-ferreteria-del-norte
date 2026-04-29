import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Promotion, PromotionItem } from "@/lib/types";

export interface PromotionsSummary {
  total: number;
  byStatus: Record<string, number>;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<Promotion>> {
  return fetchPaginated<Promotion>("/promotions", params);
}

export async function getSummary(query?: string): Promise<PromotionsSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<PromotionsSummary>(`/promotions/summary${suffix}`);
}

export async function getById(id: string): Promise<Promotion> {
  return fetchApi<Promotion>(`/promotions/${id}`);
}

export async function create(data: unknown): Promise<Promotion> {
  return fetchApi<Promotion>("/promotions", { method: "POST", body: data });
}

export async function update(id: string, data: unknown): Promise<Promotion> {
  return fetchApi<Promotion>(`/promotions/${id}`, { method: "PUT", body: data });
}

export async function addItem(
  promotionId: string,
  data: unknown
): Promise<PromotionItem> {
  return fetchApi<PromotionItem>(`/promotions/${promotionId}/items`, {
    method: "POST",
    body: data,
  });
}

export async function removeItem(
  promotionId: string,
  itemId: string
): Promise<void> {
  return fetchApi<void>(`/promotions/${promotionId}/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function active(
  params?: Record<string, string | number | undefined>
): Promise<Promotion[]> {
  return fetchApi<Promotion[]>("/promotions/active", { params });
}

export async function activate(id: string): Promise<Promotion> {
  return fetchApi<Promotion>(`/promotions/${id}/activate`, { method: "POST" });
}

export async function expire(id: string): Promise<Promotion> {
  return fetchApi<Promotion>(`/promotions/${id}/expire`, { method: "POST" });
}

export async function cancel(id: string): Promise<Promotion> {
  return fetchApi<Promotion>(`/promotions/${id}/cancel`, { method: "POST" });
}
