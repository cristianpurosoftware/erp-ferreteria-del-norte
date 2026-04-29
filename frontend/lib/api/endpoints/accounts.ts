import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Account, AccountEntry } from "@/lib/types";

export interface AccountEntriesSummary {
  total: number;
  debitAmount: number;
  creditAmount: number;
}

export async function getAllCustomerAccounts(search?: string): Promise<Account[]> {
  return fetchApi<Account[]>("/accounts/customers", { params: search ? { search } : undefined });
}

export async function getByCustomer(customerId: string): Promise<Account> {
  return fetchApi<Account>(`/accounts/customer/${customerId}`);
}

export async function getEntries(
  accountId: string,
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<AccountEntry>> {
  return fetchPaginated<AccountEntry>(`/accounts/${accountId}/entries`, params);
}

export async function getEntriesSummary(
  accountId: string,
  query?: string,
): Promise<AccountEntriesSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<AccountEntriesSummary>(`/accounts/${accountId}/entries/summary${suffix}`);
}

export async function createEntry(data: unknown): Promise<AccountEntry> {
  return fetchApi<AccountEntry>("/accounts/entries", { method: "POST", body: data });
}

export async function settleEntry(entryId: string): Promise<AccountEntry> {
  return fetchApi<AccountEntry>(`/accounts/entries/${entryId}/settle`, { method: "POST" });
}
