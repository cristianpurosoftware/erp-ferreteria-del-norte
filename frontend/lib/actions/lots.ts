"use server";

import * as lotsApi from "@/lib/api/endpoints/lots";
import type { Lot, StockByLot } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getLots(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Lot>> {
  return lotsApi.getAll(params);
}

export async function getLotById(id: string): Promise<Lot> {
  return lotsApi.getById(id);
}

export async function createLot(
  data: Record<string, unknown>
): Promise<Lot> {
  const lot = await lotsApi.create(data);
  revalidatePath("/stock");
  return lot;
}

export async function blockLot(id: string): Promise<Lot> {
  const lot = await lotsApi.block(id);
  revalidatePath("/stock");
  revalidatePath(`/stock/lotes/${id}`);
  return lot;
}

export async function unblockLot(id: string): Promise<Lot> {
  const lot = await lotsApi.unblock(id);
  revalidatePath("/stock");
  revalidatePath(`/stock/lotes/${id}`);
  return lot;
}

export async function getExpiringLots(days = 30): Promise<Lot[]> {
  return lotsApi.expiring(days);
}

export async function getStockByLot(params?: {
  productId?: string;
  warehouseId?: string;
}): Promise<StockByLot[]> {
  return lotsApi.stockByLot(params);
}

export async function runExpireLotsJob(): Promise<{ expired: number }> {
  const result = await lotsApi.runExpireJob();
  revalidatePath("/stock");
  return result;
}

export async function getLotsQuery(query: string): Promise<PaginatedResult<Lot>> {
  return lotsApi.getAll(new URLSearchParams(query));
}
export async function getLotsSummary(query?: string): Promise<lotsApi.LotsSummary> {
  return lotsApi.getSummary(query);
}
