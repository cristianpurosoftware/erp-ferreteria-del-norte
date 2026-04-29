"use server";

import * as integrationsApi from "@/lib/api/endpoints/integrations";
import type { Integration } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getIntegrations(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Integration>> {
  return integrationsApi.getAll(params);
}

export async function getIntegrationById(id: string): Promise<Integration> {
  return integrationsApi.getById(id);
}

export async function createIntegration(data: Record<string, unknown>): Promise<Integration> {
  const integration = await integrationsApi.create(data);
  revalidatePath("/integraciones");
  return integration;
}

export async function updateIntegration(id: string, data: Record<string, unknown>): Promise<Integration> {
  const integration = await integrationsApi.update(id, data);
  revalidatePath("/integraciones");
  return integration;
}

export async function deleteIntegration(id: string): Promise<void> {
  await integrationsApi.remove(id);
  revalidatePath("/integraciones");
}
