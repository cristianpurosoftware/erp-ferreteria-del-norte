import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Check } from "@/lib/types";

export interface ChecksSummary {
  total: number;
  totalAmount: number;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<Check>> { return fetchPaginated<Check>("/checks", params); }

export async function getSummary(query?: string): Promise<ChecksSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<ChecksSummary>(`/checks/summary${suffix}`);
}
export async function getById(id: string): Promise<Check> { return fetchApi<Check>(`/checks/${id}`); }
export async function create(data: unknown): Promise<Check> { return fetchApi<Check>("/checks", { method: "POST", body: data }); }
export async function portfolio(): Promise<Check[]> { return fetchApi<Check[]>("/checks/portfolio"); }
export async function deposit(id: string, bankAccountId: string): Promise<Check> { return fetchApi<Check>(`/checks/${id}/deposit`, { method: "POST", body: { bankAccountId } }); }
export async function clear(id: string): Promise<Check> { return fetchApi<Check>(`/checks/${id}/clear`, { method: "POST" }); }
export async function bounce(id: string, reason: string): Promise<Check> { return fetchApi<Check>(`/checks/${id}/bounce`, { method: "POST", body: { reason } }); }
export async function endorse(id: string, supplierId: string): Promise<Check> { return fetchApi<Check>(`/checks/${id}/endorse`, { method: "POST", body: { endorsedToSupplierId: supplierId } }); }
export async function returnToCustomer(id: string): Promise<Check> { return fetchApi<Check>(`/checks/${id}/return`, { method: "POST" }); }
export async function cancel(id: string): Promise<Check> { return fetchApi<Check>(`/checks/${id}/cancel`, { method: "POST" }); }
