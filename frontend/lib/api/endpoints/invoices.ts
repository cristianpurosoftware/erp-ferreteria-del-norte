import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Invoice } from "@/lib/types";

export interface InvoicesSummary {
  total: number;
  totalAmount: number;
  byStatus: Record<string, number>;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<Invoice>> {
  return fetchPaginated<Invoice>("/invoices", params);
}

export async function getSummary(query?: string): Promise<InvoicesSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<InvoicesSummary>(`/invoices/summary${suffix}`);
}

export async function getById(id: string): Promise<Invoice> {
  return fetchApi<Invoice>(`/invoices/${id}`);
}

export async function create(data: unknown): Promise<Invoice> {
  return fetchApi<Invoice>("/invoices", { method: "POST", body: data });
}

export async function issue(id: string): Promise<Invoice> {
  return fetchApi<Invoice>(`/invoices/${id}/issue`, { method: "POST" });
}

export async function voidInvoice(id: string): Promise<Invoice> {
  return fetchApi<Invoice>(`/invoices/${id}/void`, { method: "POST" });
}

export async function cancel(id: string): Promise<Invoice> {
  return fetchApi<Invoice>(`/invoices/${id}/cancel`, { method: "POST" });
}
