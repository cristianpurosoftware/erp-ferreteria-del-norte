"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Customer, Account, SalesZone, Route } from "@/lib/types";
import { CustomerProfileTab } from "./customer-profile-tab";
import { CustomerOrdersTab } from "./customer-orders-tab";
import { CustomerPaymentsTab } from "./customer-payments-tab";
import { CustomerAccountMovementsTab } from "./customer-account-movements-tab";

const VALID_TABS = ["perfil", "pedidos", "pagos", "cuenta"] as const;
type TabKey = (typeof VALID_TABS)[number];

interface Props {
  customer: Customer;
  account: Account | null;
  zones: SalesZone[];
  routes: Route[];
}

export function CustomerDetailTabs({ customer, account, zones, routes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("tab");
  const tab: TabKey = (VALID_TABS as readonly string[]).includes(current ?? "")
    ? (current as TabKey)
    : "perfil";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "perfil") params.delete("tab");
    else params.set("tab", value);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : `?`, { scroll: false });
  };

  return (
    <Tabs value={tab} onValueChange={handleChange} className="w-full">
      <TabsList variant="line" className="border-b border-border pb-0 w-max">
        <TabsTrigger value="perfil" className="gap-1 text-sm whitespace-nowrap">
          Perfil
        </TabsTrigger>
        <TabsTrigger value="pedidos" className="gap-1 text-sm whitespace-nowrap">
          Historial de pedidos
        </TabsTrigger>
        <TabsTrigger value="pagos" className="gap-1 text-sm whitespace-nowrap">
          Historial de pagos
        </TabsTrigger>
        <TabsTrigger value="cuenta" className="gap-1 text-sm whitespace-nowrap">
          Movimientos de cuenta
        </TabsTrigger>
      </TabsList>

      <TabsContent value="perfil" className="pt-4">
        <CustomerProfileTab customer={customer} account={account} zones={zones} routes={routes} />
      </TabsContent>
      <TabsContent value="pedidos" className="pt-4">
        <CustomerOrdersTab customerId={customer.id} />
      </TabsContent>
      <TabsContent value="pagos" className="pt-4">
        <CustomerPaymentsTab customerId={customer.id} />
      </TabsContent>
      <TabsContent value="cuenta" className="pt-4">
        {account ? (
          <CustomerAccountMovementsTab accountId={account.id} />
        ) : (
          <div className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Este cliente todavía no tiene cuenta corriente.
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
