import type { PaymentMethod } from "@/lib/types";
import { createCrud } from "./crud";

export const { getAll, getById, create, update, remove } = createCrud<PaymentMethod>("/payment-methods");
