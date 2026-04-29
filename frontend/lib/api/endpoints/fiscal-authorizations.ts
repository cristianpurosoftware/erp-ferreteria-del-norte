import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { FiscalAuthorization } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<FiscalAuthorization>> {
  return fetchPaginated<FiscalAuthorization>("/fiscal-authorizations", params);
}
export async function getById(id: string): Promise<FiscalAuthorization> {
  return fetchApi<FiscalAuthorization>(`/fiscal-authorizations/${id}`);
}
export async function requestCae(invoiceId: string): Promise<FiscalAuthorization> {
  return fetchApi<FiscalAuthorization>(`/fiscal-authorizations/request-cae/${invoiceId}`, { method: "POST" });
}
