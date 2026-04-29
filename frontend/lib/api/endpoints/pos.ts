import { fetchApi } from "../client";

export type PosPaymentMethod = "cash" | "card" | "transfer" | "account";

export interface PosSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
}

export interface PosPaymentInput {
  method: PosPaymentMethod;
  amount: number;
}

export interface CreatePosSaleInput {
  warehouseId: string;
  customerId?: string | null;
  items: PosSaleItemInput[];
  payments: PosPaymentInput[];
}

export interface PosSaleResult {
  sale: {
    id: string;
    customerId: string | null;
    orderId: string;
    invoiceId: string | null;
    warehouseId: string;
    userId: string;
    subtotal: number;
    discount: number;
    taxes: number;
    total: number;
    paymentBreakdown: PosPaymentInput[];
    status: "completed" | "voided";
    createdAt: string;
  };
  invoice?: {
    id: string;
    number: string | null;
    type: string;
    status: string;
    total: number;
    cae: string | null;
  } | null;
}

export async function createSale(data: CreatePosSaleInput): Promise<PosSaleResult> {
  return fetchApi<PosSaleResult>("/pos", { method: "POST", body: data });
}

export async function voidSale(id: string): Promise<PosSaleResult["sale"]> {
  return fetchApi<PosSaleResult["sale"]>(`/pos/${id}/void`, { method: "POST" });
}

export async function getById(id: string): Promise<PosSaleResult> {
  return fetchApi<PosSaleResult>(`/pos/${id}`);
}

export async function getToday(): Promise<PosSaleResult["sale"][]> {
  return fetchApi<PosSaleResult["sale"][]>("/pos/today");
}
