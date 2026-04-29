"use server";

import * as invoicesApi from "@/lib/api/endpoints/invoices";
import type { Invoice } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getInvoices(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Invoice>> {
  return invoicesApi.getAll(params);
}

export async function getInvoicesQuery(query: string): Promise<PaginatedResult<Invoice>> {
  return invoicesApi.getAll(new URLSearchParams(query));
}

export async function getInvoicesSummary(query?: string): Promise<invoicesApi.InvoicesSummary> {
  return invoicesApi.getSummary(query);
}

export async function getInvoiceById(id: string): Promise<Invoice> {
  return invoicesApi.getById(id);
}

export async function createInvoice(data: {
  orderId?: string;
  deliveryNoteId?: string;
  shipmentStopId?: string;
  typeId?: string;
  customerId: string;
  subtotal?: number;
  taxes?: number;
  total?: number;
  notes?: string;
  invoiceType?: string;
  salesPoint?: string;
  jurisdictionId?: string;
  originalInvoiceId?: string;
  issueDate?: string;
}): Promise<Invoice> {
  const invoice = await invoicesApi.create(data);
  revalidatePath("/comprobantes");
  return invoice;
}

export async function issueInvoice(id: string): Promise<Invoice> {
  const invoice = await invoicesApi.issue(id);
  revalidatePath("/comprobantes");
  revalidatePath(`/comprobantes/${id}`);
  return invoice;
}

export async function voidInvoice(id: string): Promise<Invoice> {
  const invoice = await invoicesApi.voidInvoice(id);
  revalidatePath("/comprobantes");
  revalidatePath(`/comprobantes/${id}`);
  return invoice;
}

export async function cancelInvoice(id: string): Promise<Invoice> {
  const invoice = await invoicesApi.cancel(id);
  revalidatePath("/comprobantes");
  revalidatePath(`/comprobantes/${id}`);
  return invoice;
}

export async function getIssuedInvoices(): Promise<Invoice[]> {
  const result = await invoicesApi.getAll({ status: "issued", limit: 100 });
  return result.items;
}

export const createInvoiceFull = createInvoice;
