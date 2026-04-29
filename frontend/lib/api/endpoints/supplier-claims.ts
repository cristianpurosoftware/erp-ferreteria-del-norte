import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { SupplierClaim } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<SupplierClaim>> {
  return fetchPaginated<SupplierClaim>("/supplier-claims", params);
}
export async function getById(id: string): Promise<SupplierClaim> { return fetchApi<SupplierClaim>(`/supplier-claims/${id}`); }
export async function create(data: unknown): Promise<SupplierClaim> { return fetchApi<SupplierClaim>("/supplier-claims", { method: "POST", body: data }); }
export async function update(id: string, data: unknown): Promise<SupplierClaim> { return fetchApi<SupplierClaim>(`/supplier-claims/${id}`, { method: "PUT", body: data }); }
export async function send(id: string): Promise<SupplierClaim> { return fetchApi<SupplierClaim>(`/supplier-claims/${id}/send`, { method: "POST" }); }
export async function acknowledge(id: string): Promise<SupplierClaim> { return fetchApi<SupplierClaim>(`/supplier-claims/${id}/acknowledge`, { method: "POST" }); }
export async function creditReceived(id: string): Promise<SupplierClaim> { return fetchApi<SupplierClaim>(`/supplier-claims/${id}/credit-received`, { method: "POST" }); }
export async function resolve(id: string): Promise<SupplierClaim> { return fetchApi<SupplierClaim>(`/supplier-claims/${id}/resolve`, { method: "POST" }); }
export async function reject(id: string): Promise<SupplierClaim> { return fetchApi<SupplierClaim>(`/supplier-claims/${id}/reject`, { method: "POST" }); }
