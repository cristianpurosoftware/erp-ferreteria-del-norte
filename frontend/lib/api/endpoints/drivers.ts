import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Driver } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<Driver>> {
  return fetchPaginated<Driver>("/drivers", params);
}
export async function getById(id: string): Promise<Driver> {
  return fetchApi<Driver>(`/drivers/${id}`);
}
export async function create(data: unknown): Promise<Driver> {
  return fetchApi<Driver>("/drivers", { method: "POST", body: data });
}
export async function update(id: string, data: unknown): Promise<Driver> {
  return fetchApi<Driver>(`/drivers/${id}`, { method: "PUT", body: data });
}
export async function remove(id: string): Promise<void> {
  return fetchApi<void>(`/drivers/${id}`, { method: "DELETE" });
}
