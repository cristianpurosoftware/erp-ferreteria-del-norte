import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Jurisdiction, CustomerJurisdiction } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<Jurisdiction>> {
  return fetchPaginated<Jurisdiction>("/jurisdictions", params);
}
export async function getById(id: string): Promise<Jurisdiction> { return fetchApi<Jurisdiction>(`/jurisdictions/${id}`); }
export async function create(data: unknown): Promise<Jurisdiction> { return fetchApi<Jurisdiction>("/jurisdictions", { method: "POST", body: data }); }
export async function update(id: string, data: unknown): Promise<Jurisdiction> { return fetchApi<Jurisdiction>(`/jurisdictions/${id}`, { method: "PUT", body: data }); }
export async function remove(id: string): Promise<void> { return fetchApi<void>(`/jurisdictions/${id}`, { method: "DELETE" }); }
export async function getCustomerJurisdictions(customerId: string): Promise<CustomerJurisdiction[]> {
  return fetchApi<CustomerJurisdiction[]>(`/jurisdictions/customers/${customerId}`);
}
export async function addCustomerJurisdiction(customerId: string, data: unknown): Promise<CustomerJurisdiction> {
  return fetchApi<CustomerJurisdiction>(`/jurisdictions/customers/${customerId}`, { method: "POST", body: data });
}
export async function removeCustomerJurisdiction(customerId: string, id: string): Promise<void> {
  return fetchApi<void>(`/jurisdictions/customers/${customerId}/${id}`, { method: "DELETE" });
}
