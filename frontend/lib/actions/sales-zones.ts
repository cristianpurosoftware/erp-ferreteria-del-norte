"use server";

import * as salesZonesApi from "@/lib/api/endpoints/sales-zones";
import type { SalesZone } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getSalesZones(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<SalesZone>> {
  return salesZonesApi.getAll(params);
}

export async function getSalesZoneById(id: string): Promise<SalesZone> {
  return salesZonesApi.getById(id);
}

export async function createSalesZone(
  data: Record<string, unknown>
): Promise<SalesZone> {
  const zone = await salesZonesApi.create(data);
  revalidatePath("/comercial/zonas");
  return zone;
}

export async function updateSalesZone(
  id: string,
  data: Record<string, unknown>
): Promise<SalesZone> {
  const zone = await salesZonesApi.update(id, data);
  revalidatePath("/comercial/zonas");
  revalidatePath(`/comercial/zonas/${id}`);
  return zone;
}

export async function deleteSalesZone(id: string): Promise<void> {
  await salesZonesApi.remove(id);
  revalidatePath("/comercial/zonas");
}

export async function getSalesZonesQuery(query: string): Promise<PaginatedResult<SalesZone>> {
  return salesZonesApi.getAll(new URLSearchParams(query));
}
