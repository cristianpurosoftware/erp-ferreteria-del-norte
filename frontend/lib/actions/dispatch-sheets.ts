"use server";
import * as api from "@/lib/api/endpoints/dispatch-sheets";
import type { DispatchSheet, DispatchSheetPrintData } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = (id?: string) => {
  revalidatePath("/logistica/hojas-de-ruta");
  if (id) revalidatePath(`/logistica/hojas-de-ruta/${id}`);
};

export async function getDispatchSheets(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<DispatchSheet>> { return api.getAll(params); }
export async function getDispatchSheetById(id: string): Promise<DispatchSheet> { return api.getById(id); }
export async function createDispatchSheet(data: Record<string, unknown>): Promise<DispatchSheet> { const r = await api.create(data); REV(); return r; }
export async function updateDispatchSheet(id: string, data: Record<string, unknown>): Promise<DispatchSheet> { const r = await api.update(id, data); REV(id); return r; }
export async function printDispatchSheet(id: string): Promise<DispatchSheet> { const r = await api.print(id); REV(id); return r; }
export async function dispatchDispatchSheet(id: string): Promise<DispatchSheet> { const r = await api.dispatch(id); REV(id); return r; }
export async function closeDispatchSheet(id: string): Promise<DispatchSheet> { const r = await api.close(id); REV(id); return r; }
export async function getDispatchSheetsQuery(query: string): Promise<PaginatedResult<DispatchSheet>> { return api.getAll(new URLSearchParams(query)); }
export async function getDispatchSheetPrintData(id: string): Promise<DispatchSheetPrintData> { return api.getPrintData(id); }
