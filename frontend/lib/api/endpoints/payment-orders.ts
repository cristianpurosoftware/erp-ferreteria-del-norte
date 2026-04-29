import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { PaymentOrder, PaymentBatch } from "@/lib/types";

export interface PaymentOrdersSummary {
  total: number;
  totalAmount: number;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<PaymentOrder>> { return fetchPaginated<PaymentOrder>("/payment-orders", params); }

export async function getSummary(query?: string): Promise<PaymentOrdersSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<PaymentOrdersSummary>(`/payment-orders/summary${suffix}`);
}
export async function getById(id: string): Promise<PaymentOrder> { return fetchApi<PaymentOrder>(`/payment-orders/${id}`); }
export async function create(data: unknown): Promise<PaymentOrder> { return fetchApi<PaymentOrder>("/payment-orders", { method: "POST", body: data }); }
export async function approve(id: string): Promise<PaymentOrder> { return fetchApi<PaymentOrder>(`/payment-orders/${id}/approve`, { method: "POST" }); }
export async function pay(id: string): Promise<PaymentOrder> { return fetchApi<PaymentOrder>(`/payment-orders/${id}/pay`, { method: "POST" }); }
export async function cancel(id: string): Promise<PaymentOrder> { return fetchApi<PaymentOrder>(`/payment-orders/${id}/cancel`, { method: "POST" }); }

// Batches
export async function getBatches(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<PaymentBatch>> { return fetchPaginated<PaymentBatch>("/payment-batches", params); }
export async function getBatchById(id: string): Promise<PaymentBatch> { return fetchApi<PaymentBatch>(`/payment-batches/${id}`); }
export async function createBatch(data: unknown): Promise<PaymentBatch> { return fetchApi<PaymentBatch>("/payment-batches", { method: "POST", body: data }); }
export async function generateBatchFile(id: string): Promise<PaymentBatch> { return fetchApi<PaymentBatch>(`/payment-batches/${id}/generate-file`, { method: "POST" }); }
export async function markBatchProcessed(id: string): Promise<PaymentBatch> { return fetchApi<PaymentBatch>(`/payment-batches/${id}/mark-processed`, { method: "POST" }); }
