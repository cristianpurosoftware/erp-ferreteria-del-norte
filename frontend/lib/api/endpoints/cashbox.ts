import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Cashbox, CashboxSession } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<Cashbox>> {
  return fetchPaginated<Cashbox>("/cashbox", params);
}

export async function getSessions(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<CashboxSession>> {
  return fetchPaginated<CashboxSession>("/cashbox/sessions", params);
}

export async function getById(id: string): Promise<Cashbox> {
  return fetchApi<Cashbox>(`/cashbox/${id}`);
}

export async function create(data: { name: string; branchId: string }): Promise<Cashbox> {
  return fetchApi<Cashbox>("/cashbox", { method: "POST", body: data });
}

export async function update(id: string, data: Record<string, unknown>): Promise<Cashbox> {
  return fetchApi<Cashbox>(`/cashbox/${id}`, { method: "PUT", body: data });
}

export async function remove(id: string): Promise<void> {
  return fetchApi<void>(`/cashbox/${id}`, { method: "DELETE" });
}

export async function open(id: string, data: { openingBalance: number }): Promise<Cashbox> {
  return fetchApi<Cashbox>(`/cashbox/${id}/open`, { method: "POST", body: data });
}

export async function close(id: string, data: { closingBalance: number; notes?: string }): Promise<Cashbox> {
  return fetchApi<Cashbox>(`/cashbox/${id}/close`, { method: "POST", body: data });
}
