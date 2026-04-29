import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Withholding, WithholdingPadron } from "@/lib/types";

export interface WithholdingsSummary {
  total: number;
  totalAmount: number;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<Withholding>> { return fetchPaginated<Withholding>("/withholdings", params); }

export async function getSummary(query?: string): Promise<WithholdingsSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<WithholdingsSummary>(`/withholdings/summary${suffix}`);
}
export async function getById(id: string): Promise<Withholding> { return fetchApi<Withholding>(`/withholdings/${id}`); }
export async function create(data: unknown): Promise<Withholding> { return fetchApi<Withholding>("/withholdings", { method: "POST", body: data }); }
export async function update(id: string, data: unknown): Promise<Withholding> { return fetchApi<Withholding>(`/withholdings/${id}`, { method: "PUT", body: data }); }
export async function remove(id: string): Promise<void> { return fetchApi<void>(`/withholdings/${id}`, { method: "DELETE" }); }
export async function padronLookup(params: { kind: string; jurisdictionId?: string; cuit: string }): Promise<WithholdingPadron | null> {
  return fetchApi<WithholdingPadron | null>("/withholdings/padrones/lookup", { params: params as Record<string, string | undefined> });
}
export async function padronImport(data: unknown): Promise<{ imported: number }> {
  return fetchApi<{ imported: number }>("/withholdings/padrones/import", { method: "POST", body: data });
}
