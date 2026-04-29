"use server";
import * as api from "@/lib/api/endpoints/fiscal-authorizations";
import type { FiscalAuthorization } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getFiscalAuthorizations(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<FiscalAuthorization>> { return api.getAll(params); }
export async function getFiscalAuthorizationById(id: string): Promise<FiscalAuthorization> { return api.getById(id); }
export async function requestCae(invoiceId: string): Promise<FiscalAuthorization> {
  const r = await api.requestCae(invoiceId);
  revalidatePath(`/comprobantes/${invoiceId}`);
  revalidatePath("/fiscal/autorizaciones");
  return r;
}

export async function getFiscalAuthorizationsQuery(query: string): Promise<PaginatedResult<FiscalAuthorization>> {
  return api.getAll(new URLSearchParams(query));
}
