import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Route, RouteVisit } from "@/lib/types";

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<Route>> {
  return fetchPaginated<Route>("/routes", params);
}

export async function getById(id: string): Promise<Route> {
  return fetchApi<Route>(`/routes/${id}`);
}

export async function create(data: unknown): Promise<Route> {
  return fetchApi<Route>("/routes", { method: "POST", body: data });
}

export async function update(id: string, data: unknown): Promise<Route> {
  return fetchApi<Route>(`/routes/${id}`, { method: "PUT", body: data });
}

export async function remove(id: string): Promise<void> {
  return fetchApi<void>(`/routes/${id}`, { method: "DELETE" });
}

export async function addVisit(routeId: string, data: unknown): Promise<RouteVisit> {
  return fetchApi<RouteVisit>(`/routes/${routeId}/visits`, {
    method: "POST",
    body: data,
  });
}

export async function getVisits(routeId: string): Promise<RouteVisit[]> {
  return fetchApi<RouteVisit[]>(`/routes/${routeId}/visits`);
}

export async function removeVisit(routeId: string, visitId: string): Promise<void> {
  return fetchApi<void>(`/routes/${routeId}/visits/${visitId}`, {
    method: "DELETE",
  });
}
