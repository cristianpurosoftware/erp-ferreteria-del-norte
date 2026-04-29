"use server";
import * as api from "@/lib/api/endpoints/vehicles";
import type { Vehicle } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = () => revalidatePath("/logistica/vehiculos");

export async function getVehicles(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<Vehicle>> { return api.getAll(params); }
export async function getVehicleById(id: string): Promise<Vehicle> { return api.getById(id); }
export async function createVehicle(data: Record<string, unknown>): Promise<Vehicle> { const v = await api.create(data); REV(); return v; }
export async function updateVehicle(id: string, data: Record<string, unknown>): Promise<Vehicle> { const v = await api.update(id, data); REV(); return v; }
export async function deleteVehicle(id: string): Promise<void> { await api.remove(id); REV(); }
export async function getVehiclesQuery(query: string): Promise<PaginatedResult<Vehicle>> { return api.getAll(new URLSearchParams(query)); }
