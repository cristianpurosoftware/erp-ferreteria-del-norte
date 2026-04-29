"use server";
import * as api from "@/lib/api/endpoints/picking-tasks";
import type { PickingTask } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = (id?: string) => {
  revalidatePath("/logistica/picking");
  if (id) revalidatePath(`/logistica/picking/${id}`);
};

export async function getPickingTasks(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<PickingTask>> { return api.getAll(params); }
export async function getPickingTaskById(id: string): Promise<PickingTask> { return api.getById(id); }
export async function assignPickingTask(id: string, assigneeId: string): Promise<PickingTask> { const r = await api.assign(id, assigneeId); REV(id); return r; }
export async function startPickingTask(id: string): Promise<PickingTask> { const r = await api.start(id); REV(id); return r; }
export async function pickItem(taskId: string, itemId: string, data: { pickedQty: number; lotId?: string; locationId?: string; short?: boolean }): Promise<PickingTask> { const r = await api.pickItem(taskId, itemId, data); REV(taskId); return r; }
export async function completePickingTask(id: string): Promise<PickingTask> { const r = await api.complete(id); REV(id); return r; }
export async function stagePickingTask(id: string): Promise<PickingTask> { const r = await api.stage(id); REV(id); return r; }
export async function cancelPickingTask(id: string): Promise<PickingTask> { const r = await api.cancel(id); REV(id); return r; }
