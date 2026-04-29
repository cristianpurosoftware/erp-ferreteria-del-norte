import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { AuditEvent } from "@/lib/types";

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<AuditEvent>> {
  return fetchPaginated<AuditEvent>("/audit", params);
}

export async function getByEntity(
  entityType: string,
  entityId: string,
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<AuditEvent>> {
  return fetchPaginated<AuditEvent>(`/audit/entity/${entityType}/${entityId}`, params);
}

export async function getById(id: string): Promise<AuditEvent> {
  return fetchApi<AuditEvent>(`/audit/${id}`);
}

export interface AuditFacets {
  entityTypes: string[];
  actions: string[];
}

export async function getFacets(): Promise<AuditFacets> {
  return fetchApi<AuditFacets>("/audit/facets");
}
