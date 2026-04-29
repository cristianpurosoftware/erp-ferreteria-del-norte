import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Customer } from "@/lib/types";

export interface CustomersSummary {
  total: number;
  totalCreditLimit: number;
  byStatus: Record<string, number>;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<Customer>> {
  return fetchPaginated<Customer>("/customers", params);
}

export async function getSummary(query?: string): Promise<CustomersSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<CustomersSummary>(`/customers/summary${suffix}`);
}

export async function getById(id: string): Promise<Customer> {
  return fetchApi<Customer>(`/customers/${id}`);
}

export async function create(data: unknown): Promise<Customer> {
  return fetchApi<Customer>("/customers", { method: "POST", body: data });
}

export async function update(id: string, data: unknown): Promise<Customer> {
  return fetchApi<Customer>(`/customers/${id}`, { method: "PUT", body: data });
}

export async function remove(id: string): Promise<void> {
  return fetchApi<void>(`/customers/${id}`, { method: "DELETE" });
}

export async function activate(id: string): Promise<Customer> {
  return fetchApi<Customer>(`/customers/${id}/activate`, { method: "POST" });
}

export async function block(id: string): Promise<Customer> {
  return fetchApi<Customer>(`/customers/${id}/block`, { method: "POST" });
}

export async function unblock(id: string): Promise<Customer> {
  return fetchApi<Customer>(`/customers/${id}/unblock`, { method: "POST" });
}
