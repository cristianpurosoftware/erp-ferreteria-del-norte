"use server";
import * as api from "@/lib/api/endpoints/inventory-counts";
import type { InventoryCount } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = (id?: string) => {
  revalidatePath("/logistica/conteos");
  if (id) revalidatePath(`/logistica/conteos/${id}`);
};

export async function getInventoryCounts(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<InventoryCount>> { return api.getAll(params); }
export async function getInventoryCountById(id: string): Promise<InventoryCount> { return api.getById(id); }
export async function createInventoryCount(data: Record<string, unknown>): Promise<InventoryCount> { const r = await api.create(data); REV(); return r; }
export async function startInventoryCount(id: string): Promise<InventoryCount> { const r = await api.start(id); REV(id); return r; }
export async function addInventoryCountLines(id: string, data: { lines: Array<{ productId: string; lotId?: string; locationId?: string; systemQty?: number; countedQty?: number; reasonCode?: string }> }): Promise<InventoryCount> { const r = await api.addLines(id, data); REV(id); return r; }
export async function approveInventoryCount(id: string): Promise<InventoryCount> { const r = await api.approve(id); REV(id); return r; }
export async function applyInventoryCount(id: string): Promise<InventoryCount> { const r = await api.apply(id); REV(id); return r; }
export async function cancelInventoryCount(id: string): Promise<InventoryCount> { const r = await api.cancel(id); REV(id); return r; }
export async function recreateInventoryCountFromStock(id: string): Promise<InventoryCount> { const r = await api.recreateFromStock(id); REV(); return r; }
export async function getInventoryCountsQuery(query: string): Promise<PaginatedResult<InventoryCount>> { return api.getAll(new URLSearchParams(query)); }
