"use server";

import * as ordersApi from "@/lib/api/endpoints/orders";
import type { Order } from "@/lib/types";
import type { PaginatedResult, CreditBlockDetail } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export type SubmitOrderResult =
  | { ok: true; order: Order }
  | {
      ok: false;
      code: "CREDIT_BLOCK";
      message: string;
      detail: CreditBlockDetail;
    }
  | { ok: false; code: string; message: string; detail?: unknown };

export async function getOrders(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Order>> {
  return ordersApi.getAll(params);
}

export async function getOrdersQuery(query: string): Promise<PaginatedResult<Order>> {
  return ordersApi.getAll(new URLSearchParams(query));
}

export async function getOrdersSummary(query?: string): Promise<ordersApi.OrdersSummary> {
  return ordersApi.getSummary(query);
}

export async function getOrderById(id: string): Promise<Order> {
  return ordersApi.getById(id);
}

export async function getOrderByIdentifier(identifier: string): Promise<Order> {
  return ordersApi.getById(identifier);
}

export async function getOrdersByCustomer(
  customerId: string,
  limit = 50
): Promise<PaginatedResult<Order>> {
  return ordersApi.getAll({ customerId, limit });
}

export async function getRecentOrders(limit = 10): Promise<PaginatedResult<Order>> {
  return ordersApi.getAll({ limit, sort: "createdAt", order: "desc" });
}

export async function getPendingOrders(): Promise<PaginatedResult<Order>> {
  return ordersApi.getAll({
    status: "pending_confirmation",
    limit: 20,
    sort: "createdAt",
    order: "asc",
  });
}

export async function createOrder(data: {
  customerId: string;
  branchId?: string;
  sellerId?: string;
  channel?: string;
  estimatedDeliveryDate?: string;
  notes?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
  }>;
  zoneId?: string;
  routeId?: string;
  operationType?: "sale" | "sample" | "donation" | "internal";
  promotionId?: string;
}): Promise<Order> {
  const order = await ordersApi.create(data);
  revalidatePath("/pedidos");
  return order;
}

export async function updateOrder(
  id: string,
  data: Record<string, unknown>
): Promise<Order> {
  const order = await ordersApi.update(id, data);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  if (order.number > 0) revalidatePath(`/pedidos/${order.number}`);
  return order;
}

// ─── Workflow actions ────────────────────────────────────────

/**
 * Submit an order for confirmation.
 *
 * Returns a discriminated union so callers can react to business errors
 * (CREDIT_BLOCK) without having to introspect a serialized Error. Unexpected
 * errors are rethrown so the generic toast catch path still works.
 */
export async function submitOrder(id: string): Promise<SubmitOrderResult> {
  try {
    const order = await ordersApi.submit(id);
    revalidatePath("/pedidos");
    revalidatePath(`/pedidos/${id}`);
    if (order.number > 0) revalidatePath(`/pedidos/${order.number}`);
    return { ok: true, order };
  } catch (err) {
    if (err instanceof ApiError && err.code === "CREDIT_BLOCK") {
      return {
        ok: false,
        code: "CREDIT_BLOCK",
        message: err.message,
        detail: (err.details as CreditBlockDetail) ?? { reason: "policy_blocked" },
      };
    }
    if (err instanceof ApiError) {
      return {
        ok: false,
        code: err.code,
        message: err.message,
        detail: err.details,
      };
    }
    throw err;
  }
}

export async function confirmOrder(id: string): Promise<Order> {
  const order = await ordersApi.confirm(id);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  if (order.number > 0) revalidatePath(`/pedidos/${order.number}`);
  return order;
}

export async function rejectOrder(id: string): Promise<Order> {
  const order = await ordersApi.reject(id);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  if (order.number > 0) revalidatePath(`/pedidos/${order.number}`);
  return order;
}

export async function reserveOrderStock(id: string): Promise<Order> {
  const order = await ordersApi.reserveStock(id);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  if (order.number > 0) revalidatePath(`/pedidos/${order.number}`);
  return order;
}

export async function startOrderPreparation(id: string): Promise<Order> {
  const order = await ordersApi.startPreparation(id);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  if (order.number > 0) revalidatePath(`/pedidos/${order.number}`);
  return order;
}

export async function markOrderReadyToDispatch(id: string): Promise<Order> {
  const order = await ordersApi.readyToDispatch(id);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  if (order.number > 0) revalidatePath(`/pedidos/${order.number}`);
  return order;
}

export async function dispatchOrder(id: string): Promise<Order> {
  const order = await ordersApi.dispatch(id);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  if (order.number > 0) revalidatePath(`/pedidos/${order.number}`);
  return order;
}

export async function deliverOrder(id: string): Promise<Order> {
  const order = await ordersApi.deliver(id);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  if (order.number > 0) revalidatePath(`/pedidos/${order.number}`);
  return order;
}

export async function completeOrder(id: string): Promise<Order> {
  const order = await ordersApi.complete(id);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  if (order.number > 0) revalidatePath(`/pedidos/${order.number}`);
  return order;
}

export async function cancelOrder(id: string): Promise<Order> {
  const order = await ordersApi.cancel(id);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  if (order.number > 0) revalidatePath(`/pedidos/${order.number}`);
  return order;
}
