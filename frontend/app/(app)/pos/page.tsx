import { getWarehouses } from "@/lib/actions/settings";
import { getCustomers } from "@/lib/actions/customers";
import { safe } from "@/lib/safe";
import { PosClient } from "./pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  // Fetch only the data the POS needs at first paint. Customer search uses
  // a client-side filter over this initial list to keep the counter snappy.
  const [warehousesResult, customersResult] = await Promise.all([
    safe(getWarehouses({ limit: 20 }), { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    safe(getCustomers({ limit: 100 }), { items: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
  ]);

  const warehouses = warehousesResult.items.map((w) => ({ id: w.id, name: w.name }));
  const customers = customersResult.items.map((c) => ({
    id: c.id,
    label: c.commercialName || c.legalName,
    creditLimit: Number(c.creditLimit ?? 0),
    currentBalance: Number((c as { currentBalance?: number }).currentBalance ?? 0),
  }));

  return <PosClient warehouses={warehouses} customers={customers} />;
}
