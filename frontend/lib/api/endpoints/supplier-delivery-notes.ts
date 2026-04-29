import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { SupplierDeliveryNote } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<SupplierDeliveryNote>> {
  return fetchPaginated<SupplierDeliveryNote>("/supplier-delivery-notes", params);
}
export async function getById(id: string): Promise<SupplierDeliveryNote> { return fetchApi<SupplierDeliveryNote>(`/supplier-delivery-notes/${id}`); }
export async function create(data: unknown): Promise<SupplierDeliveryNote> { return fetchApi<SupplierDeliveryNote>("/supplier-delivery-notes", { method: "POST", body: data }); }
export async function update(id: string, data: unknown): Promise<SupplierDeliveryNote> { return fetchApi<SupplierDeliveryNote>(`/supplier-delivery-notes/${id}`, { method: "PUT", body: data }); }
export async function receive(id: string): Promise<SupplierDeliveryNote> { return fetchApi<SupplierDeliveryNote>(`/supplier-delivery-notes/${id}/receive`, { method: "POST" }); }
export async function close(id: string): Promise<SupplierDeliveryNote> { return fetchApi<SupplierDeliveryNote>(`/supplier-delivery-notes/${id}/close`, { method: "POST" }); }
