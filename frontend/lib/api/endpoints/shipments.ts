import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";
import type { Shipment, ShipmentStop } from "@/lib/types";

export interface ShipmentsSummary {
  total: number;
  byStatus: Record<string, number>;
}

export async function getAll(
  params?: URLSearchParams | Record<string, string | number | undefined>,
): Promise<PaginatedResult<Shipment>> {
  return fetchPaginated<Shipment>("/shipments", params);
}

export async function getSummary(query?: string): Promise<ShipmentsSummary> {
  const suffix = query ? `?${query}` : "";
  return fetchApi<ShipmentsSummary>(`/shipments/summary${suffix}`);
}
export async function getById(id: string): Promise<Shipment> {
  return fetchApi<Shipment>(`/shipments/${id}`);
}
export async function create(data: unknown): Promise<Shipment> {
  return fetchApi<Shipment>("/shipments", { method: "POST", body: data });
}
export async function update(id: string, data: unknown): Promise<Shipment> {
  return fetchApi<Shipment>(`/shipments/${id}`, { method: "PUT", body: data });
}
export async function load(id: string): Promise<Shipment> {
  return fetchApi<Shipment>(`/shipments/${id}/load`, { method: "POST" });
}
export async function depart(id: string): Promise<Shipment> {
  return fetchApi<Shipment>(`/shipments/${id}/depart`, { method: "POST" });
}
export async function complete(id: string): Promise<Shipment> {
  return fetchApi<Shipment>(`/shipments/${id}/complete`, { method: "POST" });
}
export async function cancel(id: string): Promise<Shipment> {
  return fetchApi<Shipment>(`/shipments/${id}/cancel`, { method: "POST" });
}
export async function addStop(id: string, data: unknown): Promise<ShipmentStop> {
  return fetchApi<ShipmentStop>(`/shipments/${id}/stops`, { method: "POST", body: data });
}
export async function arriveStop(id: string, stopId: string): Promise<ShipmentStop> {
  return fetchApi<ShipmentStop>(`/shipments/${id}/stops/${stopId}/arrive`, { method: "POST" });
}
export async function deliverStop(id: string, stopId: string, data?: { signatureUrl?: string; notes?: string; lat?: number; lng?: number }): Promise<ShipmentStop> {
  return fetchApi<ShipmentStop>(`/shipments/${id}/stops/${stopId}/deliver`, { method: "POST", body: data ?? {} });
}
export async function rejectStop(id: string, stopId: string, data: { reason: string; notes?: string }): Promise<ShipmentStop> {
  return fetchApi<ShipmentStop>(`/shipments/${id}/stops/${stopId}/reject`, { method: "POST", body: data });
}
export async function partialStop(id: string, stopId: string, data?: { notes?: string }): Promise<ShipmentStop> {
  return fetchApi<ShipmentStop>(`/shipments/${id}/stops/${stopId}/partial`, { method: "POST", body: data ?? {} });
}
