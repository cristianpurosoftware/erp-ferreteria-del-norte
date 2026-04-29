import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Vehicle } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<Vehicle>> {
  return fetchPaginated<Vehicle>("/vehicles", params);
}
export async function getById(id: string): Promise<Vehicle> {
  return fetchApi<Vehicle>(`/vehicles/${id}`);
}
export async function create(data: unknown): Promise<Vehicle> {
  return fetchApi<Vehicle>("/vehicles", { method: "POST", body: data });
}
export async function update(id: string, data: unknown): Promise<Vehicle> {
  return fetchApi<Vehicle>(`/vehicles/${id}`, { method: "PUT", body: data });
}
export async function remove(id: string): Promise<void> {
  return fetchApi<void>(`/vehicles/${id}`, { method: "DELETE" });
}
