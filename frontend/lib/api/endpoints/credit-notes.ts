import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { CreditNote } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<CreditNote>> {
  return fetchPaginated<CreditNote>("/credit-notes", params);
}
export async function getById(id: string): Promise<CreditNote> { return fetchApi<CreditNote>(`/credit-notes/${id}`); }
export async function create(data: unknown): Promise<CreditNote> { return fetchApi<CreditNote>("/credit-notes", { method: "POST", body: data }); }
export async function issue(id: string): Promise<CreditNote> { return fetchApi<CreditNote>(`/credit-notes/${id}/issue`, { method: "POST" }); }
export async function apply(id: string): Promise<CreditNote> { return fetchApi<CreditNote>(`/credit-notes/${id}/apply`, { method: "POST" }); }
export async function cancel(id: string): Promise<CreditNote> { return fetchApi<CreditNote>(`/credit-notes/${id}/cancel`, { method: "POST" }); }
