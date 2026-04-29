"use server";

import * as productsApi from "@/lib/api/endpoints/products";
import type { Product } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";
import type { ProductFormValues } from "@/lib/validations/product";

function normalizePayload(data: ProductFormValues): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };
  const optionalStrings = ["sku", "description", "categoryId", "brandId", "unitId", "preferredSupplierId"] as const;
  for (const key of optionalStrings) {
    if (result[key] === "" || result[key] === undefined) result[key] = null;
  }
  return result;
}

export async function getProducts(
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<Product>> {
  return productsApi.getAll(params);
}

export async function getProductsQuery(
  query: string
): Promise<PaginatedResult<Product>> {
  return productsApi.getAll(new URLSearchParams(query));
}

export async function getActiveProducts(): Promise<PaginatedResult<Product>> {
  return productsApi.getAll({ status: "active" });
}

export async function getProductById(id: string): Promise<Product> {
  return productsApi.getById(id);
}

export async function getProductsByCategory(
  categoryId: string
): Promise<PaginatedResult<Product>> {
  return productsApi.getAll({ categoryId, status: "active" });
}

export async function createProduct(data: ProductFormValues): Promise<Product> {
  const product = await productsApi.create(normalizePayload(data));
  revalidatePath("/catalogo");
  return product;
}

export async function updateProduct(
  id: string,
  data: ProductFormValues
): Promise<Product> {
  const product = await productsApi.update(id, normalizePayload(data));
  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/${id}`);
  return product;
}

export async function activateProduct(id: string): Promise<Product> {
  const product = await productsApi.activate(id);
  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/${id}`);
  return product;
}

export async function discontinueProduct(id: string): Promise<Product> {
  const product = await productsApi.discontinue(id);
  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/${id}`);
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  await productsApi.remove(id);
  revalidatePath("/catalogo");
}

export async function getProductPrices(id: string) {
  return productsApi.getPrices(id);
}

export async function getProductOrders(id: string, limit = 10) {
  return productsApi.getOrders(id, limit);
}
