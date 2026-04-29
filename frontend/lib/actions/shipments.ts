"use server";
import * as api from "@/lib/api/endpoints/shipments";
import type { Shipment, ShipmentStop } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

const REV = (id?: string) => {
  revalidatePath("/logistica/envios");
  if (id) revalidatePath(`/logistica/envios/${id}`);
};

export async function getShipments(params?: Record<string, string | number | undefined>): Promise<PaginatedResult<Shipment>> { return api.getAll(params); }
export async function getShipmentsQuery(query: string): Promise<PaginatedResult<Shipment>> { return api.getAll(new URLSearchParams(query)); }
export async function getShipmentsSummary(query?: string): Promise<api.ShipmentsSummary> { return api.getSummary(query); }
export async function getShipmentById(id: string): Promise<Shipment> { return api.getById(id); }
export async function createShipment(data: Record<string, unknown>): Promise<Shipment> { const r = await api.create(data); REV(); return r; }
export async function updateShipment(id: string, data: Record<string, unknown>): Promise<Shipment> { const r = await api.update(id, data); REV(id); return r; }
export async function loadShipment(id: string): Promise<Shipment> { const r = await api.load(id); REV(id); return r; }
export async function departShipment(id: string): Promise<Shipment> { const r = await api.depart(id); REV(id); return r; }
export async function completeShipment(id: string): Promise<Shipment> { const r = await api.complete(id); REV(id); return r; }
export async function cancelShipment(id: string): Promise<Shipment> { const r = await api.cancel(id); REV(id); return r; }
export async function addShipmentStop(id: string, data: Record<string, unknown>): Promise<ShipmentStop> { const r = await api.addStop(id, data); REV(id); return r; }
export async function arriveStop(id: string, stopId: string): Promise<ShipmentStop> { const r = await api.arriveStop(id, stopId); REV(id); return r; }
export async function deliverStop(id: string, stopId: string, data?: { signatureUrl?: string; notes?: string; lat?: number; lng?: number }): Promise<ShipmentStop> { const r = await api.deliverStop(id, stopId, data); REV(id); return r; }
export async function rejectStop(id: string, stopId: string, data: { reason: string; notes?: string }): Promise<ShipmentStop> { const r = await api.rejectStop(id, stopId, data); REV(id); return r; }
export async function partialStop(id: string, stopId: string, data?: { notes?: string }): Promise<ShipmentStop> { const r = await api.partialStop(id, stopId, data); REV(id); return r; }
