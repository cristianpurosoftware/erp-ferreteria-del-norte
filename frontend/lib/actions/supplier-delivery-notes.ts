"use server";
import * as api from "@/lib/api/endpoints/supplier-delivery-notes";
import type { SupplierDeliveryNote } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = () => revalidatePath("/compras");

export async function getSupplierDeliveryNotes(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<SupplierDeliveryNote>> { return api.getAll(params); }
export async function getSupplierDeliveryNoteById(id: string): Promise<SupplierDeliveryNote> { return api.getById(id); }
export async function createSupplierDeliveryNote(data: Record<string, unknown>): Promise<SupplierDeliveryNote> { const r = await api.create(data); REV(); return r; }
export async function updateSupplierDeliveryNote(id: string, data: Record<string, unknown>): Promise<SupplierDeliveryNote> { const r = await api.update(id, data); REV(); return r; }
export async function receiveSupplierDeliveryNote(id: string): Promise<SupplierDeliveryNote> { const r = await api.receive(id); REV(); return r; }
export async function closeSupplierDeliveryNote(id: string): Promise<SupplierDeliveryNote> { const r = await api.close(id); REV(); return r; }
export async function getSupplierDeliveryNotesQuery(query: string): Promise<PaginatedResult<SupplierDeliveryNote>> { return api.getAll(new URLSearchParams(query)); }
