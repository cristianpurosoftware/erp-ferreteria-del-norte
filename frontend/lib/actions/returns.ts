"use server";
import * as api from "@/lib/api/endpoints/returns";
import type { ReturnOrder } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = (id?: string) => {
  revalidatePath("/logistica/devoluciones");
  if (id) revalidatePath(`/logistica/devoluciones/${id}`);
};

export async function getReturns(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<ReturnOrder>> { return api.getAll(params); }
export async function getReturnById(id: string): Promise<ReturnOrder> { return api.getById(id); }
export async function createReturn(data: Record<string, unknown>): Promise<ReturnOrder> { const r = await api.create(data); REV(); return r; }
export async function confirmReturn(id: string): Promise<ReturnOrder> { const r = await api.confirm(id); REV(id); return r; }
export async function receiveReturn(id: string): Promise<ReturnOrder> { const r = await api.receive(id); REV(id); return r; }
export async function inspectReturn(id: string, data: { lines: Array<{ itemId: string; condition: string; destLocationId?: string }> }): Promise<ReturnOrder> { const r = await api.inspect(id, data); REV(id); return r; }
export async function closeReturn(id: string): Promise<ReturnOrder> { const r = await api.close(id); REV(id); return r; }
export async function cancelReturn(id: string): Promise<ReturnOrder> { const r = await api.cancel(id); REV(id); return r; }
export async function getReturnsQuery(query: string): Promise<PaginatedResult<ReturnOrder>> { return api.getAll(new URLSearchParams(query)); }
