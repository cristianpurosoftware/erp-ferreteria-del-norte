import type { Integration } from "@/lib/types";
import { createCrud } from "./crud";

export const { getAll, getById, create, update, remove } = createCrud<Integration>("/integrations");
