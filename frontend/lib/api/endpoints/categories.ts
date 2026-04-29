import type { Category } from "@/lib/types";
import { createCrud } from "./crud";

export const { getAll, getById, create, update, remove } = createCrud<Category>("/categories");
