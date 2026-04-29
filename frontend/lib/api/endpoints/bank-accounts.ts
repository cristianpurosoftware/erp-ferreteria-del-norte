import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { BankAccount } from "@/lib/types";

export interface BankAccountsSummary {
  total: number;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<BankAccount>> { return fetchPaginated<BankAccount>("/bank-accounts", params); }

export async function getSummary(query?: string): Promise<BankAccountsSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<BankAccountsSummary>(`/bank-accounts/summary${suffix}`);
}
export async function getById(id: string): Promise<BankAccount> { return fetchApi<BankAccount>(`/bank-accounts/${id}`); }
export async function create(data: unknown): Promise<BankAccount> { return fetchApi<BankAccount>("/bank-accounts", { method: "POST", body: data }); }
export async function update(id: string, data: unknown): Promise<BankAccount> { return fetchApi<BankAccount>(`/bank-accounts/${id}`, { method: "PUT", body: data }); }
export async function remove(id: string): Promise<void> { return fetchApi<void>(`/bank-accounts/${id}`, { method: "DELETE" }); }
