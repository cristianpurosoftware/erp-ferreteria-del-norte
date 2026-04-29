"use server";

import * as customerVisitsApi from "@/lib/api/endpoints/customer-visits";
import type { CustomerVisit } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getCustomerVisits(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<CustomerVisit>> {
  return customerVisitsApi.getAll(params);
}

export async function createCustomerVisit(
  data: Record<string, unknown>
): Promise<CustomerVisit> {
  const visit = await customerVisitsApi.create(data);
  revalidatePath("/comercial/rutas");
  if (typeof data.customerId === "string") {
    revalidatePath(`/clientes/${data.customerId}`);
  }
  return visit;
}
