"use server";

import * as customersApi from "@/lib/api/endpoints/customers";
import * as accountsApi from "@/lib/api/endpoints/accounts";
import type { Customer, Account, AccountEntry } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getCustomers(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Customer>> {
  return customersApi.getAll(params);
}

export async function getCustomersQuery(query: string): Promise<PaginatedResult<Customer>> {
  return customersApi.getAll(new URLSearchParams(query));
}

export async function getCustomersSummary(query?: string): Promise<customersApi.CustomersSummary> {
  return customersApi.getSummary(query);
}

export async function getCustomerById(id: string): Promise<Customer> {
  return customersApi.getById(id);
}

export async function getCustomersWithDebt(): Promise<PaginatedResult<Customer>> {
  return customersApi.getAll({ hasDebt: "true" });
}

export async function createCustomer(data: {
  customerType: "company" | "individual";
  legalName: string;
  commercialName?: string;
  taxId?: string;
  taxCondition?: string;
  channel?: string;
  assignedSellerId?: string;
  priceListId?: string;
  creditLimit?: number;
  phone?: string;
  email?: string;
}): Promise<Customer> {
  const customer = await customersApi.create(data);
  revalidatePath("/clientes");
  return customer;
}

export async function updateCustomer(
  id: string,
  data: Record<string, unknown>
): Promise<Customer> {
  const customer = await customersApi.update(id, data);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return customer;
}

export async function activateCustomer(id: string): Promise<Customer> {
  const customer = await customersApi.activate(id);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return customer;
}

export async function blockCustomer(id: string): Promise<Customer> {
  const customer = await customersApi.block(id);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return customer;
}

export async function unblockCustomer(id: string): Promise<Customer> {
  const customer = await customersApi.unblock(id);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  await customersApi.remove(id);
  revalidatePath("/clientes");
}

// ─── Account data ───────────────────────────────────────────

export async function getCustomerAccount(customerId: string): Promise<Account> {
  return accountsApi.getByCustomer(customerId);
}

export async function getAccountEntries(
  accountId: string,
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<AccountEntry>> {
  return accountsApi.getEntries(accountId, params);
}

export async function getAccountEntriesQuery(
  accountId: string,
  query: string,
): Promise<PaginatedResult<AccountEntry>> {
  return accountsApi.getEntries(accountId, new URLSearchParams(query));
}

export async function getAccountEntriesSummary(
  accountId: string,
  query?: string,
): Promise<accountsApi.AccountEntriesSummary> {
  return accountsApi.getEntriesSummary(accountId, query);
}
