import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { SupplierInvoice } from "@/lib/types";

export interface SupplierInvoicesSummary {
  total: number;
  totalAmount: number;
}

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<SupplierInvoice>> {
  return fetchPaginated<SupplierInvoice>("/supplier-invoices", params);
}

export async function getSummary(query?: string): Promise<SupplierInvoicesSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<SupplierInvoicesSummary>(`/supplier-invoices/summary${suffix}`);
}
export async function getById(id: string): Promise<SupplierInvoice> { return fetchApi<SupplierInvoice>(`/supplier-invoices/${id}`); }
export async function create(data: unknown): Promise<SupplierInvoice> { return fetchApi<SupplierInvoice>("/supplier-invoices", { method: "POST", body: data }); }
export async function update(id: string, data: unknown): Promise<SupplierInvoice> { return fetchApi<SupplierInvoice>(`/supplier-invoices/${id}`, { method: "PUT", body: data }); }
export async function submit(id: string): Promise<SupplierInvoice> { return fetchApi<SupplierInvoice>(`/supplier-invoices/${id}/submit-for-approval`, { method: "POST" }); }
export async function approve(id: string): Promise<SupplierInvoice> { return fetchApi<SupplierInvoice>(`/supplier-invoices/${id}/approve`, { method: "POST" }); }
export async function dispute(id: string, reason?: string): Promise<SupplierInvoice> { return fetchApi<SupplierInvoice>(`/supplier-invoices/${id}/dispute`, { method: "POST", body: { reason } }); }
export async function cancel(id: string): Promise<SupplierInvoice> { return fetchApi<SupplierInvoice>(`/supplier-invoices/${id}/cancel`, { method: "POST" }); }
