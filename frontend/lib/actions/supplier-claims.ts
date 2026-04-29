"use server";
import * as api from "@/lib/api/endpoints/supplier-claims";
import type { SupplierClaim } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = () => revalidatePath("/compras");

export async function getSupplierClaims(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<SupplierClaim>> { return api.getAll(params); }
export async function getSupplierClaimById(id: string): Promise<SupplierClaim> { return api.getById(id); }
export async function createSupplierClaim(data: Record<string, unknown>): Promise<SupplierClaim> { const r = await api.create(data); REV(); return r; }
export async function updateSupplierClaim(id: string, data: Record<string, unknown>): Promise<SupplierClaim> { const r = await api.update(id, data); REV(); return r; }
export async function sendSupplierClaim(id: string): Promise<SupplierClaim> { const r = await api.send(id); REV(); return r; }
export async function acknowledgeSupplierClaim(id: string): Promise<SupplierClaim> { const r = await api.acknowledge(id); REV(); return r; }
export async function creditReceivedSupplierClaim(id: string): Promise<SupplierClaim> { const r = await api.creditReceived(id); REV(); return r; }
export async function resolveSupplierClaim(id: string): Promise<SupplierClaim> { const r = await api.resolve(id); REV(); return r; }
export async function rejectSupplierClaim(id: string): Promise<SupplierClaim> { const r = await api.reject(id); REV(); return r; }
export async function getSupplierClaimsQuery(query: string): Promise<PaginatedResult<SupplierClaim>> { return api.getAll(new URLSearchParams(query)); }
