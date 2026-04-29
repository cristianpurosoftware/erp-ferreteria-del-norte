import type { Supplier } from "@/lib/types";
import { createCrud } from "./crud";

export interface SuppliersSummary {
  total: number;
  active: number;
}

const api = createCrud<Supplier>("/suppliers");
export const { getAll, getById, create, update, remove } = api;
export const getSummary = (query?: string) => api.getSummary<SuppliersSummary>(query);
