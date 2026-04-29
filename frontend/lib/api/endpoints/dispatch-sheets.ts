import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { DispatchSheet, DispatchSheetPrintData } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<DispatchSheet>> {
  return fetchPaginated<DispatchSheet>("/dispatch-sheets", params);
}
export async function getById(id: string): Promise<DispatchSheet> {
  return fetchApi<DispatchSheet>(`/dispatch-sheets/${id}`);
}
export async function create(data: unknown): Promise<DispatchSheet> {
  return fetchApi<DispatchSheet>("/dispatch-sheets", { method: "POST", body: data });
}
export async function update(id: string, data: unknown): Promise<DispatchSheet> {
  return fetchApi<DispatchSheet>(`/dispatch-sheets/${id}`, { method: "PUT", body: data });
}
export async function print(id: string): Promise<DispatchSheet> {
  return fetchApi<DispatchSheet>(`/dispatch-sheets/${id}/print`, { method: "POST" });
}
export async function dispatch(id: string): Promise<DispatchSheet> {
  return fetchApi<DispatchSheet>(`/dispatch-sheets/${id}/dispatch`, { method: "POST" });
}
export async function close(id: string): Promise<DispatchSheet> {
  return fetchApi<DispatchSheet>(`/dispatch-sheets/${id}/close`, { method: "POST" });
}
export async function getPrintData(id: string): Promise<DispatchSheetPrintData> {
  return fetchApi<DispatchSheetPrintData>(`/dispatch-sheets/${id}/print-data`);
}
