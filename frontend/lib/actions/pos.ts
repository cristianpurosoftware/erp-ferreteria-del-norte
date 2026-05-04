"use server";

import * as posApi from "@/lib/api/endpoints/pos";
import * as productsApi from "@/lib/api/endpoints/products";
import { ApiError } from "@/lib/api/client";
import { revalidatePath } from "next/cache";
import type { Product } from "@/lib/types";

export type PosSaleSubmitResult =
  | { ok: true; result: posApi.PosSaleResult }
  | { ok: false; code: string; message: string; detail?: unknown };

export async function findProductBySku(sku: string): Promise<Product | null> {
  try {
    return await productsApi.getBySku(sku.trim());
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createPosSale(
  input: posApi.CreatePosSaleInput
): Promise<PosSaleSubmitResult> {
  try {
    const result = await posApi.createSale(input);
    revalidatePath("/pos");
    revalidatePath("/stock/niveles");
    revalidatePath("/comprobantes");
    return { ok: true, result };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        ok: false,
        code: err.code,
        message: err.message,
        detail: err.details,
      };
    }
    throw err;
  }
}

export async function getRecentPosSales(limit = 100): Promise<posApi.PosSaleListItem[]> {
  return posApi.listRecent(limit);
}

export async function getPosSaleById(id: string): Promise<posApi.PosSaleResult> {
  return posApi.getById(id);
}

export async function getTodayPosSales(): Promise<posApi.PosSaleListItem[]> {
  return posApi.getToday();
}
