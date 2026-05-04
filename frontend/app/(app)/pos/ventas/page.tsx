import { getRecentPosSales } from "@/lib/actions/pos";
import { PosSalesClient } from "./pos-sales-client";

export default async function PosVentasPage() {
  const sales = await getRecentPosSales(100);
  return <PosSalesClient initialSales={sales} />;
}
