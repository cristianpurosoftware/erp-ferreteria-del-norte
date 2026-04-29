import type { Role } from "@/lib/types";
import { createCrud } from "./crud";

export const { getAll, getById, create, update, remove } = createCrud<Role>("/roles");
