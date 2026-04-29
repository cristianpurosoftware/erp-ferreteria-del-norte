"use server";
import * as api from "@/lib/api/endpoints/drivers";
import type { Driver } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = () => revalidatePath("/logistica/choferes");

export async function getDrivers(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<Driver>> { return api.getAll(params); }
export async function getDriverById(id: string): Promise<Driver> { return api.getById(id); }
export async function createDriver(data: Record<string, unknown>): Promise<Driver> { const d = await api.create(data); REV(); return d; }
export async function updateDriver(id: string, data: Record<string, unknown>): Promise<Driver> { const d = await api.update(id, data); REV(); return d; }
export async function deleteDriver(id: string): Promise<void> { await api.remove(id); REV(); }
export async function getDriversQuery(query: string): Promise<PaginatedResult<Driver>> { return api.getAll(new URLSearchParams(query)); }
