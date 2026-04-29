import type { PaymentCondition } from "@/lib/types";
import { createCrud } from "./crud";

export const { getAll, getById, create, update, remove } = createCrud<PaymentCondition>("/payment-conditions");
