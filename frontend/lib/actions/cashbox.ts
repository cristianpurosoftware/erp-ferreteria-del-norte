"use server";

import * as cashboxApi from "@/lib/api/endpoints/cashbox";
import type { Cashbox, CashboxSession } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getCashboxes(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Cashbox>> {
  return cashboxApi.getAll(params);
}

export async function getCashboxSessions(
  params?: Record<string, string | number | undefined>,
): Promise<PaginatedResult<CashboxSession>> {
  return cashboxApi.getSessions(params);
}

export async function getCashboxById(id: string): Promise<Cashbox> {
  return cashboxApi.getById(id);
}

export async function openCashbox(
  id: string,
  data: { openingBalance: number }
): Promise<Cashbox> {
  const cashbox = await cashboxApi.open(id, data);
  revalidatePath("/caja");
  return cashbox;
}

export async function closeCashbox(
  id: string,
  data: { closingBalance: number; notes?: string }
): Promise<Cashbox> {
  const cashbox = await cashboxApi.close(id, data);
  revalidatePath("/caja");
  return cashbox;
}

export async function getCashboxesQuery(query: string): Promise<PaginatedResult<Cashbox>> {
  return cashboxApi.getAll(new URLSearchParams(query));
}
export async function getCashboxSessionsQuery(query: string): Promise<PaginatedResult<CashboxSession>> {
  return cashboxApi.getSessions(new URLSearchParams(query));
}
