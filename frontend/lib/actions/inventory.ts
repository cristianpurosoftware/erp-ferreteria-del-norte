"use server";

import * as inventoryApi from "@/lib/api/endpoints/inventory";
import type { Stock, StockMovement } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getStock(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Stock>> {
  return inventoryApi.getStock(params);
}

export async function getLowStock(): Promise<PaginatedResult<Stock>> {
  return inventoryApi.getStock({ lowStock: "true" });
}

export async function getStockByProduct(
  productId: string
): Promise<PaginatedResult<Stock>> {
  return inventoryApi.getStock({ productId });
}

export async function getStockMovements(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<StockMovement>> {
  return inventoryApi.getMovements(params);
}

export async function getStockMovementsQuery(query: string): Promise<PaginatedResult<StockMovement>> {
  return inventoryApi.getMovements(new URLSearchParams(query));
}

export async function getStockMovementsSummary(query?: string): Promise<inventoryApi.MovementsSummary> {
  return inventoryApi.getMovementsSummary(query);
}

export async function getMovementsByProduct(
  productId: string,
  limit = 100
): Promise<PaginatedResult<StockMovement>> {
  return inventoryApi.getMovements({ productId, limit });
}

export async function createMovement(data: {
  type: string;
  productId: string;
  variantId?: string;
  sourceWarehouseId?: string;
  destWarehouseId?: string;
  quantity: number;
  reason?: string;
}): Promise<StockMovement> {
  const movement = await inventoryApi.createMovement(data);
  revalidatePath("/stock");
  return movement;
}

export async function adjustStock(data: {
  productId: string;
  variantId?: string;
  warehouseId: string;
  quantity: number;
  reason: string;
}): Promise<void> {
  await inventoryApi.adjustStock(data);
  revalidatePath("/stock");
}

export async function transferStock(data: {
  productId: string;
  variantId?: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  quantity: number;
  reason?: string;
}): Promise<void> {
  await inventoryApi.transferStock(data);
  revalidatePath("/stock");
}
