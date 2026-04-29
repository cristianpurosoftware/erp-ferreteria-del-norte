import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Payment } from "@/lib/types";

export interface PaymentsSummary {
  total: number;
  totalAmount: number;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<Payment>> {
  return fetchPaginated<Payment>("/payments", params);
}

export async function getSummary(query?: string): Promise<PaymentsSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<PaymentsSummary>(`/payments/summary${suffix}`);
}

export async function getById(id: string): Promise<Payment> {
  return fetchApi<Payment>(`/payments/${id}`);
}

export async function create(data: unknown): Promise<Payment> {
  return fetchApi<Payment>("/payments", { method: "POST", body: data });
}

export async function register(id: string): Promise<Payment> {
  return fetchApi<Payment>(`/payments/${id}/register`, { method: "POST" });
}

export async function apply(id: string): Promise<Payment> {
  return fetchApi<Payment>(`/payments/${id}/apply`, { method: "POST" });
}

export async function reconcile(id: string): Promise<Payment> {
  return fetchApi<Payment>(`/payments/${id}/reconcile`, { method: "POST" });
}

export async function cancel(id: string): Promise<Payment> {
  return fetchApi<Payment>(`/payments/${id}/cancel`, { method: "POST" });
}
