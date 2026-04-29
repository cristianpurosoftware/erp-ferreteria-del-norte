"use server";

import * as paymentsApi from "@/lib/api/endpoints/payments";
import * as accountsApi from "@/lib/api/endpoints/accounts";
import * as reportsApi from "@/lib/api/endpoints/reports";
import type { Payment, Account, AccountEntry } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getPayments(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Payment>> {
  return paymentsApi.getAll(params);
}

export async function getPaymentsByCustomer(
  customerId: string,
  limit = 50
): Promise<PaginatedResult<Payment>> {
  return paymentsApi.getAll({ customerId, limit });
}

export async function getCustomerAccounts(): Promise<Account[]> {
  return accountsApi.getAllCustomerAccounts();
}

export async function getCustomerAccount(customerId: string): Promise<Account> {
  return accountsApi.getByCustomer(customerId);
}

export async function getAccountEntries(
  accountId: string,
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<AccountEntry>> {
  return accountsApi.getEntries(accountId, params);
}

export async function getAccountEntriesByCustomer(
  customerId: string,
  limit = 50
): Promise<PaginatedResult<AccountEntry>> {
  const account = await accountsApi.getByCustomer(customerId);
  return accountsApi.getEntries(account.id, { limit });
}

export interface AgingReport {
  range: string;
  amount: number;
  count: number;
  color: string;
}

export async function getAgingReport(): Promise<AgingReport[]> {
  // Use the same logic as the reports version — customerDebt grouped into buckets
  const { getAgingReport: getFromReports } = await import("@/lib/actions/reports");
  return getFromReports();
}

export async function createPayment(data: {
  type: string;
  customerId: string;
  paymentMethod: string;
  amount: number;
  currency?: string;
  externalReference?: string;
  notes?: string;
}): Promise<Payment> {
  const payment = await paymentsApi.create(data);
  revalidatePath("/cobranzas");
  return payment;
}

export async function registerPayment(id: string): Promise<Payment> {
  const payment = await paymentsApi.register(id);
  revalidatePath("/cobranzas");
  return payment;
}

export async function applyPayment(id: string): Promise<Payment> {
  const payment = await paymentsApi.apply(id);
  revalidatePath("/cobranzas");
  return payment;
}

export async function reconcilePayment(id: string): Promise<Payment> {
  const payment = await paymentsApi.reconcile(id);
  revalidatePath("/cobranzas");
  return payment;
}

export async function cancelPayment(id: string): Promise<Payment> {
  const payment = await paymentsApi.cancel(id);
  revalidatePath("/cobranzas");
  return payment;
}

export async function settleAccountEntry(entryId: string): Promise<AccountEntry> {
  const entry = await accountsApi.settleEntry(entryId);
  revalidatePath("/cobranzas");
  return entry;
}

export async function getPaymentsQuery(query: string): Promise<PaginatedResult<Payment>> {
  return paymentsApi.getAll(new URLSearchParams(query));
}

export async function getPaymentsSummary(query?: string): Promise<paymentsApi.PaymentsSummary> {
  return paymentsApi.getSummary(query);
}
