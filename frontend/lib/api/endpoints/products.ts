import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Product } from "@/lib/types";

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<Product>> {
  return fetchPaginated<Product>("/products", params);
}

export async function getById(id: string): Promise<Product> {
  return fetchApi<Product>(`/products/${id}`);
}

export async function getBySku(sku: string): Promise<Product> {
  return fetchApi<Product>(`/products/by-sku/${encodeURIComponent(sku)}`);
}

export async function create(data: unknown): Promise<Product> {
  return fetchApi<Product>("/products", { method: "POST", body: data });
}

export async function update(id: string, data: unknown): Promise<Product> {
  return fetchApi<Product>(`/products/${id}`, { method: "PUT", body: data });
}

export async function remove(id: string): Promise<void> {
  return fetchApi<void>(`/products/${id}`, { method: "DELETE" });
}

export async function activate(id: string): Promise<Product> {
  return fetchApi<Product>(`/products/${id}/activate`, { method: "POST" });
}

export async function discontinue(id: string): Promise<Product> {
  return fetchApi<Product>(`/products/${id}/discontinue`, { method: "POST" });
}

export async function getPrices(id: string): Promise<any[]> {
  return fetchApi<any[]>(`/products/${id}/prices`);
}

export async function getOrders(id: string, limit = 10): Promise<any[]> {
  return fetchApi<any[]>(`/products/${id}/orders?limit=${limit}`);
}
