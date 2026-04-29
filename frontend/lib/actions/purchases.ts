"use server";

import * as purchasesApi from "@/lib/api/endpoints/purchases";
import * as suppliersApi from "@/lib/api/endpoints/suppliers";
import type { PurchaseOrder, PurchaseReception, Supplier } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

// ─── Purchase Orders ────────────────────────────────────────

export async function getPurchaseOrders(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<PurchaseOrder>> {
  return purchasesApi.getAll(params);
}

// ─── Suppliers (server-side table helpers) ──────────────────

export async function getSuppliersQuery(query: string): Promise<PaginatedResult<Supplier>> {
  return suppliersApi.getAll(new URLSearchParams(query));
}

export async function getSuppliersSummary(query?: string): Promise<suppliersApi.SuppliersSummary> {
  return suppliersApi.getSummary(query);
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder> {
  return purchasesApi.getById(id);
}

export async function createPurchaseOrder(data: {
  supplierId: string;
  branchId?: string;
  date?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
}): Promise<PurchaseOrder> {
  const po = await purchasesApi.create(data);
  revalidatePath("/compras");
  return po;
}

export async function approvePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const po = await purchasesApi.approve(id);
  revalidatePath("/compras");
  revalidatePath(`/compras/${id}`);
  return po;
}

export async function sendPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const po = await purchasesApi.send(id);
  revalidatePath("/compras");
  revalidatePath(`/compras/${id}`);
  return po;
}

export async function receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const po = await purchasesApi.receive(id);
  revalidatePath("/compras");
  revalidatePath(`/compras/${id}`);
  return po;
}

export async function cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const po = await purchasesApi.cancel(id);
  revalidatePath("/compras");
  revalidatePath(`/compras/${id}`);
  return po;
}

export async function updatePurchaseOrder(id: string, data: {
  supplierId?: string;
  branchId?: string | null;
  notes?: string | null;
  items: Array<{ productId: string; quantity: number; unitCost: number }>;
}): Promise<PurchaseOrder> {
  const po = await purchasesApi.update(id, data);
  revalidatePath("/compras");
  revalidatePath(`/compras/${id}`);
  return po;
}

export async function createReception(data: {
  purchaseOrderId: string;
  warehouseId: string;
  notes?: string;
}): Promise<PurchaseReception> {
  const { purchaseOrderId, ...body } = data;
  const reception = await purchasesApi.createReception(purchaseOrderId, body);
  revalidatePath("/compras");
  revalidatePath(`/compras/${data.purchaseOrderId}`);
  revalidatePath("/stock");
  return reception;
}

// ─── Suppliers ──────────────────────────────────────────────

export async function getSuppliers(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Supplier>> {
  return suppliersApi.getAll(params);
}

export async function getSupplierById(id: string): Promise<Supplier> {
  return suppliersApi.getById(id);
}

export async function createSupplier(data: {
  name: string;
  taxId?: string;
  primaryContact?: string;
  phone?: string;
  email?: string;
  paymentCondition?: string;
}): Promise<Supplier> {
  const supplier = await suppliersApi.create(data);
  revalidatePath("/compras/proveedores");
  return supplier;
}

export async function updateSupplier(
  id: string,
  data: Record<string, unknown>
): Promise<Supplier> {
  const supplier = await suppliersApi.update(id, data);
  revalidatePath("/compras/proveedores");
  return supplier;
}

export async function deleteSupplier(id: string): Promise<void> {
  await suppliersApi.remove(id);
  revalidatePath("/compras/proveedores");
}

// ─── Server-side table query + summary ──────────────────────
export async function getPurchaseOrdersQuery(query: string): Promise<PaginatedResult<PurchaseOrder>> {
  return purchasesApi.getAll(new URLSearchParams(query));
}
export async function getPurchaseOrdersSummary(query?: string): Promise<purchasesApi.PurchasesSummary> {
  return purchasesApi.getSummary(query);
}
