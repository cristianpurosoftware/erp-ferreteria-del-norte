import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { PickingTask } from "@/lib/types";

export async function getAll(params?: URLSearchParams | Record<string, string | number | undefined>): Promise<PaginatedResult<PickingTask>> {
  return fetchPaginated<PickingTask>("/picking-tasks", params);
}
export async function getById(id: string): Promise<PickingTask> {
  return fetchApi<PickingTask>(`/picking-tasks/${id}`);
}
export async function create(data: unknown): Promise<PickingTask> {
  return fetchApi<PickingTask>("/picking-tasks", { method: "POST", body: data });
}
export async function assign(id: string, assigneeId: string): Promise<PickingTask> {
  return fetchApi<PickingTask>(`/picking-tasks/${id}/assign`, { method: "POST", body: { assignedTo: assigneeId } });
}
export async function start(id: string): Promise<PickingTask> {
  return fetchApi<PickingTask>(`/picking-tasks/${id}/start`, { method: "POST" });
}
export async function pickItem(id: string, itemId: string, data: { pickedQty: number; lotId?: string; locationId?: string; short?: boolean }): Promise<PickingTask> {
  return fetchApi<PickingTask>(`/picking-tasks/${id}/items/${itemId}/pick`, { method: "POST", body: data });
}
export async function complete(id: string): Promise<PickingTask> {
  return fetchApi<PickingTask>(`/picking-tasks/${id}/complete`, { method: "POST" });
}
export async function stage(id: string): Promise<PickingTask> {
  return fetchApi<PickingTask>(`/picking-tasks/${id}/stage`, { method: "POST" });
}
export async function cancel(id: string): Promise<PickingTask> {
  return fetchApi<PickingTask>(`/picking-tasks/${id}/cancel`, { method: "POST" });
}
