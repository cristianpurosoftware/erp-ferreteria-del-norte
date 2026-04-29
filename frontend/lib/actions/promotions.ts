"use server";

import * as promotionsApi from "@/lib/api/endpoints/promotions";
import type { Promotion, PromotionItem } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getPromotions(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Promotion>> {
  return promotionsApi.getAll(params);
}

export async function getPromotionById(id: string): Promise<Promotion> {
  return promotionsApi.getById(id);
}

export async function getActivePromotions(params?: {
  customerId?: string;
  zoneId?: string;
  channel?: string;
  customerCategory?: string;
}): Promise<Promotion[]> {
  return promotionsApi.active(params as Record<string, string | undefined>);
}

export async function createPromotion(
  data: Record<string, unknown>
): Promise<Promotion> {
  const promo = await promotionsApi.create(data);
  revalidatePath("/comercial/promociones");
  return promo;
}

export async function updatePromotion(
  id: string,
  data: Record<string, unknown>
): Promise<Promotion> {
  const promo = await promotionsApi.update(id, data);
  revalidatePath("/comercial/promociones");
  revalidatePath(`/comercial/promociones/${id}`);
  return promo;
}

export async function activatePromotion(id: string): Promise<Promotion> {
  const promo = await promotionsApi.activate(id);
  revalidatePath("/comercial/promociones");
  revalidatePath(`/comercial/promociones/${id}`);
  return promo;
}

export async function expirePromotion(id: string): Promise<Promotion> {
  const promo = await promotionsApi.expire(id);
  revalidatePath("/comercial/promociones");
  revalidatePath(`/comercial/promociones/${id}`);
  return promo;
}

export async function cancelPromotion(id: string): Promise<Promotion> {
  const promo = await promotionsApi.cancel(id);
  revalidatePath("/comercial/promociones");
  revalidatePath(`/comercial/promociones/${id}`);
  return promo;
}

export async function addPromotionItem(
  promotionId: string,
  data: Record<string, unknown>
): Promise<PromotionItem> {
  const item = await promotionsApi.addItem(promotionId, data);
  revalidatePath(`/comercial/promociones/${promotionId}`);
  return item;
}

export async function removePromotionItem(
  promotionId: string,
  itemId: string
): Promise<void> {
  await promotionsApi.removeItem(promotionId, itemId);
  revalidatePath(`/comercial/promociones/${promotionId}`);
}

export async function getPromotionsQuery(query: string): Promise<PaginatedResult<Promotion>> {
  return promotionsApi.getAll(new URLSearchParams(query));
}
export async function getPromotionsSummary(query?: string): Promise<promotionsApi.PromotionsSummary> {
  return promotionsApi.getSummary(query);
}
