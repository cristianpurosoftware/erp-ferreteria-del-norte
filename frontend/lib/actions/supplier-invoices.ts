"use server";
import * as api from "@/lib/api/endpoints/supplier-invoices";
import type { SupplierInvoice } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = (id?: string) => { revalidatePath("/compras"); if (id) revalidatePath(`/compras/facturas/${id}`); };

export async function getSupplierInvoices(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<SupplierInvoice>> { return api.getAll(params); }
export async function getSupplierInvoiceById(id: string): Promise<SupplierInvoice> { return api.getById(id); }
export async function createSupplierInvoice(data: Record<string, unknown>): Promise<SupplierInvoice> { const r = await api.create(data); REV(); return r; }
export async function updateSupplierInvoice(id: string, data: Record<string, unknown>): Promise<SupplierInvoice> { const r = await api.update(id, data); REV(id); return r; }
export async function submitSupplierInvoice(id: string): Promise<SupplierInvoice> { const r = await api.submit(id); REV(id); return r; }
export async function approveSupplierInvoice(id: string): Promise<SupplierInvoice> { const r = await api.approve(id); REV(id); return r; }
export async function disputeSupplierInvoice(id: string, reason?: string): Promise<SupplierInvoice> { const r = await api.dispute(id, reason); REV(id); return r; }
export async function cancelSupplierInvoice(id: string): Promise<SupplierInvoice> { const r = await api.cancel(id); REV(id); return r; }
export async function getSupplierInvoicesQuery(query: string): Promise<PaginatedResult<SupplierInvoice>> { return api.getAll(new URLSearchParams(query)); }
export async function getSupplierInvoicesSummary(query?: string): Promise<api.SupplierInvoicesSummary> { return api.getSummary(query); }
