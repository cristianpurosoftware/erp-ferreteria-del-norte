import { fetchApi } from "../client";
import type { PriceList } from "@/lib/types";
import { createCrud } from "./crud";

const crud = createCrud<PriceList>("/price-lists");
export const { getAll, getById, create, update, remove } = crud;

export async function addItem(priceListId: string, data: unknown) {
  return fetchApi<unknown>(`/price-lists/${priceListId}/items`, { method: "POST", body: data });
}

export async function removeItem(priceListId: string, itemId: string) {
  return fetchApi<void>(`/price-lists/${priceListId}/items/${itemId}`, { method: "DELETE" });
}
