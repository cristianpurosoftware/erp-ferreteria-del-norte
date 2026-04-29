import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { BankStatement } from "@/lib/types";

export interface BankStatementsSummary {
  total: number;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<BankStatement>> { return fetchPaginated<BankStatement>("/bank-statements", params); }

export async function getSummary(query?: string): Promise<BankStatementsSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<BankStatementsSummary>(`/bank-statements/summary${suffix}`);
}
export async function getById(id: string): Promise<BankStatement> { return fetchApi<BankStatement>(`/bank-statements/${id}`); }
export async function create(data: unknown): Promise<BankStatement> { return fetchApi<BankStatement>("/bank-statements", { method: "POST", body: data }); }
export async function reconcile(id: string): Promise<BankStatement> { return fetchApi<BankStatement>(`/bank-statements/${id}/reconcile`, { method: "POST" }); }
