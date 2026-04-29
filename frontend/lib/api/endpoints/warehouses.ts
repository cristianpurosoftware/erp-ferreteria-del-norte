import type { Warehouse } from "@/lib/types";
import { createCrud } from "./crud";

export const { getAll, getById, create, update, remove } = createCrud<Warehouse>("/warehouses");
