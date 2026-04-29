import type { InvoiceType } from "@/lib/types";
import { createCrud } from "./crud";

export const { getAll, getById, create, update, remove } = createCrud<InvoiceType>("/invoice-types");
