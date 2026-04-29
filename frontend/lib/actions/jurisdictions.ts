"use server";
import * as api from "@/lib/api/endpoints/jurisdictions";
import type { Jurisdiction, CustomerJurisdiction } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = () => revalidatePath("/fiscal/jurisdicciones");

export async function getJurisdictions(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<Jurisdiction>> { return api.getAll(params); }
export async function getJurisdictionById(id: string): Promise<Jurisdiction> { return api.getById(id); }
export async function createJurisdiction(data: Record<string, unknown>): Promise<Jurisdiction> { const r = await api.create(data); REV(); return r; }
export async function updateJurisdiction(id: string, data: Record<string, unknown>): Promise<Jurisdiction> { const r = await api.update(id, data); REV(); return r; }
export async function deleteJurisdiction(id: string): Promise<void> { await api.remove(id); REV(); }
export async function getCustomerJurisdictions(customerId: string): Promise<CustomerJurisdiction[]> { return api.getCustomerJurisdictions(customerId); }
export async function addCustomerJurisdiction(customerId: string, data: Record<string, unknown>): Promise<CustomerJurisdiction> {
  const r = await api.addCustomerJurisdiction(customerId, data);
  revalidatePath(`/clientes/${customerId}`);
  return r;
}
export async function removeCustomerJurisdiction(customerId: string, id: string): Promise<void> {
  await api.removeCustomerJurisdiction(customerId, id);
  revalidatePath(`/clientes/${customerId}`);
}

export async function getJurisdictionsQuery(query: string): Promise<PaginatedResult<Jurisdiction>> {
  return api.getAll(new URLSearchParams(query));
}
