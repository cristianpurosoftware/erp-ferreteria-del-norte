"use server";

import * as commissionsApi from "@/lib/api/endpoints/commissions";
import type { Commission } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getCommissions(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Commission>> {
  return commissionsApi.getAll(params);
}

export async function getCommissionById(id: string): Promise<Commission> {
  return commissionsApi.getById(id);
}

export async function approveCommission(id: string): Promise<Commission> {
  const c = await commissionsApi.approve(id);
  revalidatePath("/comercial/comisiones");
  return c;
}

export async function reverseCommission(id: string): Promise<Commission> {
  const c = await commissionsApi.reverse(id);
  revalidatePath("/comercial/comisiones");
  return c;
}

export async function getCommissionsQuery(query: string): Promise<PaginatedResult<Commission>> {
  return commissionsApi.getAll(new URLSearchParams(query));
}
export async function getCommissionsSummary(query?: string): Promise<commissionsApi.CommissionsSummary> {
  return commissionsApi.getSummary(query);
}
