"use server";

import * as locationsApi from "@/lib/api/endpoints/warehouse-locations";
import type { WarehouseLocation } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getWarehouseLocations(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<WarehouseLocation>> {
  return locationsApi.getAll(params);
}

export async function getWarehouseLocationById(
  id: string
): Promise<WarehouseLocation> {
  return locationsApi.getById(id);
}

export async function createWarehouseLocation(
  data: Record<string, unknown>
): Promise<WarehouseLocation> {
  const loc = await locationsApi.create(data);
  revalidatePath("/stock");
  return loc;
}

export async function updateWarehouseLocation(
  id: string,
  data: Record<string, unknown>
): Promise<WarehouseLocation> {
  const loc = await locationsApi.update(id, data);
  revalidatePath("/stock");
  return loc;
}

export async function deleteWarehouseLocation(id: string): Promise<void> {
  await locationsApi.remove(id);
  revalidatePath("/stock");
}

export async function getWarehouseLocationsQuery(query: string): Promise<PaginatedResult<WarehouseLocation>> {
  return locationsApi.getAll(new URLSearchParams(query));
}
