"use server";

import * as companyApi from "@/lib/api/endpoints/company";
import * as branchesApi from "@/lib/api/endpoints/branches";
import * as warehousesApi from "@/lib/api/endpoints/warehouses";
import * as categoriesApi from "@/lib/api/endpoints/categories";
import * as brandsApi from "@/lib/api/endpoints/brands";
import * as unitsApi from "@/lib/api/endpoints/units";
import * as taxesApi from "@/lib/api/endpoints/taxes";
import * as invoiceTypesApi from "@/lib/api/endpoints/invoice-types";
import * as paymentConditionsApi from "@/lib/api/endpoints/payment-conditions";
import * as priceListsApi from "@/lib/api/endpoints/price-lists";
import * as paymentMethodsApi from "@/lib/api/endpoints/payment-methods";
import * as cashboxApi from "@/lib/api/endpoints/cashbox";
import type {
  Company,
  Branch,
  Warehouse,
  Category,
  Brand,
  Unit,
  Tax,
  InvoiceType,
  PaymentCondition,
  PaymentMethod,
  PriceList,
  Cashbox,
} from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

// ─── Company ────────────────────────────────────────────────

export async function getCompany(): Promise<Company> {
  return companyApi.get();
}

export async function updateCompany(data: Record<string, unknown>): Promise<Company> {
  const company = await companyApi.update(data);
  revalidatePath("/configuracion");
  return company;
}

// ─── Branches ───────────────────────────────────────────────

export async function getBranches(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Branch>> {
  return branchesApi.getAll(params);
}

export async function getBranchesQuery(query: string): Promise<PaginatedResult<Branch>> {
  return branchesApi.getAll(new URLSearchParams(query));
}

export async function getBranchById(id: string): Promise<Branch> {
  return branchesApi.getById(id);
}

export async function createBranch(data: Record<string, unknown>): Promise<Branch> {
  const branch = await branchesApi.create(data);
  revalidatePath("/configuracion");
  return branch;
}

export async function updateBranch(id: string, data: Record<string, unknown>): Promise<Branch> {
  const branch = await branchesApi.update(id, data);
  revalidatePath("/configuracion");
  return branch;
}

export async function deleteBranch(id: string): Promise<void> {
  await branchesApi.remove(id);
  revalidatePath("/configuracion");
}

// ─── Warehouses ─────────────────────────────────────────────

export async function getWarehouses(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Warehouse>> {
  return warehousesApi.getAll(params);
}

export async function getWarehousesQuery(query: string): Promise<PaginatedResult<Warehouse>> {
  return warehousesApi.getAll(new URLSearchParams(query));
}

export async function getWarehouseById(id: string): Promise<Warehouse> {
  return warehousesApi.getById(id);
}

export async function createWarehouse(data: Record<string, unknown>): Promise<Warehouse> {
  const wh = await warehousesApi.create(data);
  revalidatePath("/configuracion");
  return wh;
}

export async function updateWarehouse(id: string, data: Record<string, unknown>): Promise<Warehouse> {
  const wh = await warehousesApi.update(id, data);
  revalidatePath("/configuracion");
  return wh;
}

export async function deleteWarehouse(id: string): Promise<void> {
  await warehousesApi.remove(id);
  revalidatePath("/configuracion");
}

// ─── Categories ─────────────────────────────────────────────

export async function getCategories(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Category>> {
  return categoriesApi.getAll(params);
}

export async function getCategoriesQuery(query: string): Promise<PaginatedResult<Category>> {
  return categoriesApi.getAll(new URLSearchParams(query));
}

export async function getCategoryById(id: string): Promise<Category> {
  return categoriesApi.getById(id);
}

export async function createCategory(data: Record<string, unknown>): Promise<Category> {
  const cat = await categoriesApi.create(data);
  revalidatePath("/configuracion");
  return cat;
}

export async function updateCategory(id: string, data: Record<string, unknown>): Promise<Category> {
  const cat = await categoriesApi.update(id, data);
  revalidatePath("/configuracion");
  return cat;
}

export async function deleteCategory(id: string): Promise<void> {
  await categoriesApi.remove(id);
  revalidatePath("/configuracion");
}

// ─── Brands ─────────────────────────────────────────────────

export async function getBrands(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Brand>> {
  return brandsApi.getAll(params);
}

export async function getBrandsQuery(query: string): Promise<PaginatedResult<Brand>> {
  return brandsApi.getAll(new URLSearchParams(query));
}

export async function getBrandById(id: string): Promise<Brand> {
  return brandsApi.getById(id);
}

export async function createBrand(data: Record<string, unknown>): Promise<Brand> {
  const brand = await brandsApi.create(data);
  revalidatePath("/configuracion");
  return brand;
}

export async function updateBrand(id: string, data: Record<string, unknown>): Promise<Brand> {
  const brand = await brandsApi.update(id, data);
  revalidatePath("/configuracion");
  return brand;
}

export async function deleteBrand(id: string): Promise<void> {
  await brandsApi.remove(id);
  revalidatePath("/configuracion");
}

// ─── Units ──────────────────────────────────────────────────

export async function getUnits(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Unit>> {
  return unitsApi.getAll(params);
}

export async function getUnitsQuery(query: string): Promise<PaginatedResult<Unit>> {
  return unitsApi.getAll(new URLSearchParams(query));
}

export async function getUnitById(id: string): Promise<Unit> {
  return unitsApi.getById(id);
}

export async function createUnit(data: Record<string, unknown>): Promise<Unit> {
  const unit = await unitsApi.create(data);
  revalidatePath("/configuracion");
  return unit;
}

export async function updateUnit(id: string, data: Record<string, unknown>): Promise<Unit> {
  const unit = await unitsApi.update(id, data);
  revalidatePath("/configuracion");
  return unit;
}

export async function deleteUnit(id: string): Promise<void> {
  await unitsApi.remove(id);
  revalidatePath("/configuracion");
}

// ─── Taxes ──────────────────────────────────────────────────

export async function getTaxes(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Tax>> {
  return taxesApi.getAll(params);
}

export async function getTaxesQuery(query: string): Promise<PaginatedResult<Tax>> {
  return taxesApi.getAll(new URLSearchParams(query));
}

export async function getTaxById(id: string): Promise<Tax> {
  return taxesApi.getById(id);
}

export async function createTax(data: Record<string, unknown>): Promise<Tax> {
  const tax = await taxesApi.create(data);
  revalidatePath("/configuracion");
  return tax;
}

export async function updateTax(id: string, data: Record<string, unknown>): Promise<Tax> {
  const tax = await taxesApi.update(id, data);
  revalidatePath("/configuracion");
  return tax;
}

export async function deleteTax(id: string): Promise<void> {
  await taxesApi.remove(id);
  revalidatePath("/configuracion");
}

// ─── Invoice Types ──────────────────────────────────────────

export async function getInvoiceTypes(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<InvoiceType>> {
  return invoiceTypesApi.getAll(params);
}

export async function getInvoiceTypesQuery(query: string): Promise<PaginatedResult<InvoiceType>> {
  return invoiceTypesApi.getAll(new URLSearchParams(query));
}

export async function getInvoiceTypeById(id: string): Promise<InvoiceType> {
  return invoiceTypesApi.getById(id);
}

export async function createInvoiceType(data: Record<string, unknown>): Promise<InvoiceType> {
  const it = await invoiceTypesApi.create(data);
  revalidatePath("/configuracion");
  return it;
}

export async function updateInvoiceType(id: string, data: Record<string, unknown>): Promise<InvoiceType> {
  const it = await invoiceTypesApi.update(id, data);
  revalidatePath("/configuracion");
  return it;
}

export async function deleteInvoiceType(id: string): Promise<void> {
  await invoiceTypesApi.remove(id);
  revalidatePath("/configuracion");
}

// ─── Payment Conditions ────────────────────────────────────

export async function getPaymentConditions(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<PaymentCondition>> {
  return paymentConditionsApi.getAll(params);
}

export async function getPaymentConditionsQuery(query: string): Promise<PaginatedResult<PaymentCondition>> {
  return paymentConditionsApi.getAll(new URLSearchParams(query));
}

export async function getPaymentConditionById(id: string): Promise<PaymentCondition> {
  return paymentConditionsApi.getById(id);
}

export async function createPaymentCondition(data: Record<string, unknown>): Promise<PaymentCondition> {
  const pc = await paymentConditionsApi.create(data);
  revalidatePath("/configuracion");
  return pc;
}

export async function updatePaymentCondition(id: string, data: Record<string, unknown>): Promise<PaymentCondition> {
  const pc = await paymentConditionsApi.update(id, data);
  revalidatePath("/configuracion");
  return pc;
}

export async function deletePaymentCondition(id: string): Promise<void> {
  await paymentConditionsApi.remove(id);
  revalidatePath("/configuracion");
}

// ─── Payment Methods ───────────────────────────────────────

export async function getPaymentMethods(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<PaymentMethod>> {
  return paymentMethodsApi.getAll(params);
}

export async function getPaymentMethodsQuery(query: string): Promise<PaginatedResult<PaymentMethod>> {
  return paymentMethodsApi.getAll(new URLSearchParams(query));
}

export async function getPaymentMethodById(id: string): Promise<PaymentMethod> {
  return paymentMethodsApi.getById(id);
}

export async function createPaymentMethod(data: Record<string, unknown>): Promise<PaymentMethod> {
  const pm = await paymentMethodsApi.create(data);
  revalidatePath("/configuracion");
  return pm;
}

export async function updatePaymentMethod(id: string, data: Record<string, unknown>): Promise<PaymentMethod> {
  const pm = await paymentMethodsApi.update(id, data);
  revalidatePath("/configuracion");
  return pm;
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await paymentMethodsApi.remove(id);
  revalidatePath("/configuracion");
}

// ─── Price Lists ────────────────────────────────────────────

export async function getPriceLists(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<PriceList>> {
  return priceListsApi.getAll(params);
}

export async function getPriceListsQuery(query: string): Promise<PaginatedResult<PriceList>> {
  return priceListsApi.getAll(new URLSearchParams(query));
}

export async function getPriceListById(id: string): Promise<PriceList> {
  return priceListsApi.getById(id);
}

export async function createPriceList(data: Record<string, unknown>): Promise<PriceList> {
  const pl = await priceListsApi.create(data);
  revalidatePath("/configuracion");
  return pl;
}

export async function updatePriceList(id: string, data: Record<string, unknown>): Promise<PriceList> {
  const pl = await priceListsApi.update(id, data);
  revalidatePath("/configuracion");
  return pl;
}

export async function deletePriceList(id: string): Promise<void> {
  await priceListsApi.remove(id);
  revalidatePath("/configuracion");
}

// ─── Cashbox ──────────────────────────────────────────────

export async function getCashboxList(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<Cashbox>> {
  return cashboxApi.getAll(params);
}

export async function getCashboxListQuery(query: string): Promise<PaginatedResult<Cashbox>> {
  return cashboxApi.getAll(new URLSearchParams(query));
}

export async function getCashboxById(id: string): Promise<Cashbox> {
  return cashboxApi.getById(id);
}

export async function createCashbox(data: Record<string, unknown>): Promise<Cashbox> {
  const cb = await cashboxApi.create(data as any);
  revalidatePath("/configuracion");
  revalidatePath("/caja");
  return cb;
}

export async function updateCashbox(id: string, data: Record<string, unknown>): Promise<Cashbox> {
  const cb = await cashboxApi.update(id, data);
  revalidatePath("/configuracion");
  revalidatePath("/caja");
  return cb;
}

export async function deleteCashbox(id: string): Promise<void> {
  await cashboxApi.remove(id);
  revalidatePath("/configuracion");
  revalidatePath("/caja");
}
