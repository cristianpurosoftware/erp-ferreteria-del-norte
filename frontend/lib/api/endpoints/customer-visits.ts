import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { CustomerVisit } from "@/lib/types";

export async function getAll(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<CustomerVisit>> {
  return fetchPaginated<CustomerVisit>("/customer-visits", params);
}

export async function create(data: unknown): Promise<CustomerVisit> {
  return fetchApi<CustomerVisit>("/customer-visits", {
    method: "POST",
    body: data,
  });
}
