"use server";

import * as routesApi from "@/lib/api/endpoints/routes";
import type { Route, RouteVisit } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getRoutes(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Route>> {
  return routesApi.getAll(params);
}

export async function getRouteById(id: string): Promise<Route> {
  return routesApi.getById(id);
}

export async function createRoute(
  data: Record<string, unknown>
): Promise<Route> {
  const route = await routesApi.create(data);
  revalidatePath("/comercial/rutas");
  return route;
}

export async function updateRoute(
  id: string,
  data: Record<string, unknown>
): Promise<Route> {
  const route = await routesApi.update(id, data);
  revalidatePath("/comercial/rutas");
  revalidatePath(`/comercial/rutas/${id}`);
  return route;
}

export async function deleteRoute(id: string): Promise<void> {
  await routesApi.remove(id);
  revalidatePath("/comercial/rutas");
}

export async function getRouteVisits(routeId: string): Promise<RouteVisit[]> {
  return routesApi.getVisits(routeId);
}

export async function addRouteVisit(
  routeId: string,
  data: Record<string, unknown>
): Promise<RouteVisit> {
  const visit = await routesApi.addVisit(routeId, data);
  revalidatePath(`/comercial/rutas/${routeId}`);
  return visit;
}

export async function removeRouteVisit(
  routeId: string,
  visitId: string
): Promise<void> {
  await routesApi.removeVisit(routeId, visitId);
  revalidatePath(`/comercial/rutas/${routeId}`);
}

export async function getRoutesQuery(query: string): Promise<PaginatedResult<Route>> {
  return routesApi.getAll(new URLSearchParams(query));
}
