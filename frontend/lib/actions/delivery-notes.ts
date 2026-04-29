"use server";
import * as api from "@/lib/api/endpoints/delivery-notes";
import type { DeliveryNote } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = () => revalidatePath("/comprobantes");

export async function getDeliveryNotes(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<DeliveryNote>> { return api.getAll(params); }
export async function getDeliveryNoteById(id: string): Promise<DeliveryNote> { return api.getById(id); }
export async function createDeliveryNote(data: Record<string, unknown>): Promise<DeliveryNote> { const r = await api.create(data); REV(); return r; }
export async function issueDeliveryNote(id: string): Promise<DeliveryNote> { const r = await api.issue(id); REV(); return r; }
export async function cancelDeliveryNote(id: string): Promise<DeliveryNote> { const r = await api.cancel(id); REV(); return r; }
export async function deliveryNoteFromShipmentStop(stopId: string): Promise<DeliveryNote> { const r = await api.fromShipmentStop(stopId); REV(); return r; }
export async function getDeliveryNotesQuery(query: string): Promise<PaginatedResult<DeliveryNote>> { return api.getAll(new URLSearchParams(query)); }

export async function getIssuedDeliveryNotes(): Promise<DeliveryNote[]> {
  const result = await api.getAll({ status: "issued", limit: 100 });
  return result.items;
}
