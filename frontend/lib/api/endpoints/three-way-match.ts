import { fetchApi } from "../client";
import type { ThreeWayMatch } from "@/lib/types";

export async function getById(id: string): Promise<ThreeWayMatch> { return fetchApi<ThreeWayMatch>(`/three-way-match/${id}`); }
export async function override(id: string, data: { reason: string; notes?: string }): Promise<ThreeWayMatch> {
  return fetchApi<ThreeWayMatch>(`/three-way-match/${id}/override`, { method: "POST", body: data });
}
