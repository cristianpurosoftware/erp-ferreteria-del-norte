import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { DeliveryNote } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<DeliveryNote>> {
  return fetchPaginated<DeliveryNote>("/delivery-notes", params);
}
export async function getById(id: string): Promise<DeliveryNote> { return fetchApi<DeliveryNote>(`/delivery-notes/${id}`); }
export async function create(data: unknown): Promise<DeliveryNote> { return fetchApi<DeliveryNote>("/delivery-notes", { method: "POST", body: data }); }
export async function issue(id: string): Promise<DeliveryNote> { return fetchApi<DeliveryNote>(`/delivery-notes/${id}/issue`, { method: "POST" }); }
export async function cancel(id: string): Promise<DeliveryNote> { return fetchApi<DeliveryNote>(`/delivery-notes/${id}/cancel`, { method: "POST" }); }
export async function fromShipmentStop(stopId: string): Promise<DeliveryNote> {
  return fetchApi<DeliveryNote>(`/delivery-notes/from-shipment-stop/${stopId}`, { method: "POST" });
}
