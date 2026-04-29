import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { DebitNote } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<DebitNote>> {
  return fetchPaginated<DebitNote>("/debit-notes", params);
}
export async function getById(id: string): Promise<DebitNote> { return fetchApi<DebitNote>(`/debit-notes/${id}`); }
export async function create(data: unknown): Promise<DebitNote> { return fetchApi<DebitNote>("/debit-notes", { method: "POST", body: data }); }
export async function issue(id: string): Promise<DebitNote> { return fetchApi<DebitNote>(`/debit-notes/${id}/issue`, { method: "POST" }); }
export async function cancel(id: string): Promise<DebitNote> { return fetchApi<DebitNote>(`/debit-notes/${id}/cancel`, { method: "POST" }); }
