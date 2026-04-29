import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCustomerById, getCustomerAccount } from "@/lib/actions/customers";
import { getTeam } from "@/lib/actions/team";
import { getSalesZones } from "@/lib/actions/sales-zones";
import { getRoutes } from "@/lib/actions/routes";
import { cn } from "@/lib/utils";
import type { CustomerStatus } from "@/lib/types";
import { CustomerActions } from "@/components/customers/customer-actions";
import { CustomerDetailTabs } from "@/components/customers/customer-detail-tabs";

const statusConfig: Record<CustomerStatus, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "text-gray-500" },
  active: { label: "Activo", color: "text-p3" },
  on_hold: { label: "En espera", color: "text-yellow-600" },
  blocked: { label: "Bloqueado", color: "text-red-500" },
  inactive: { label: "Inactivo", color: "text-gray-400" },
  archived: { label: "Archivado", color: "text-gray-400" },
};

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomerById(id);
  } catch {
    notFound();
  }

  if (!customer) notFound();

  const [account, teamResult, zonesResult, routesResult] = await Promise.all([
    getCustomerAccount(id).catch(() => null),
    getTeam({ limit: 50 }).catch(() => ({ items: [] })),
    getSalesZones({ limit: 500 }).catch(() => ({ items: [] })),
    getRoutes({ limit: 500 }).catch(() => ({ items: [] })),
  ]);

  const sellers = (teamResult as { items: Array<{ id: string; first_name: string; last_name: string }> }).items;
  const st = statusConfig[customer.status];

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href="/clientes"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{customer.commercialName || customer.legalName}</h1>
              <span className={cn("text-xs font-medium", st.color)}>{st.label}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {customer.commercialName ? customer.legalName : ""}{customer.taxId ? ` · ${customer.taxId}` : ""}
            </p>
          </div>
          <CustomerActions customer={customer} sellers={sellers} />
        </div>

        <CustomerDetailTabs
          customer={customer}
          account={account}
          zones={zonesResult.items}
          routes={routesResult.items}
        />
      </div>
    </div>
  );
}
