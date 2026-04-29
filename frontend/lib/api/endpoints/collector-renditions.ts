import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { CollectorRendition } from "@/lib/types";

export interface RenditionsSummary {
  total: number;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<CollectorRendition>> { return fetchPaginated<CollectorRendition>("/collector-renditions", params); }

export async function getSummary(query?: string): Promise<RenditionsSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<RenditionsSummary>(`/collector-renditions/summary${suffix}`);
}
export async function getById(id: string): Promise<CollectorRendition> { return fetchApi<CollectorRendition>(`/collector-renditions/${id}`); }
export async function create(data: unknown): Promise<CollectorRendition> { return fetchApi<CollectorRendition>("/collector-renditions", { method: "POST", body: data }); }
export async function submit(id: string): Promise<CollectorRendition> { return fetchApi<CollectorRendition>(`/collector-renditions/${id}/submit`, { method: "POST" }); }
export async function approve(id: string): Promise<CollectorRendition> { return fetchApi<CollectorRendition>(`/collector-renditions/${id}/approve`, { method: "POST" }); }
export async function reject(id: string, reason?: string): Promise<CollectorRendition> { return fetchApi<CollectorRendition>(`/collector-renditions/${id}/reject`, { method: "POST", body: { reason } }); }
