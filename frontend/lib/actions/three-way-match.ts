"use server";
import * as api from "@/lib/api/endpoints/three-way-match";
import type { ThreeWayMatch } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function getThreeWayMatch(id: string): Promise<ThreeWayMatch> { return api.getById(id); }
export async function overrideThreeWayMatch(id: string, data: { reason: string; notes?: string }): Promise<ThreeWayMatch> {
  const r = await api.override(id, data);
  revalidatePath(`/compras/3-way/${id}`);
  return r;
}
