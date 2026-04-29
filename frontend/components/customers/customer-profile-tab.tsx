import { Badge } from "@/components/ui/badge";
import {
  User,
  Phone,
  Mail,
  ShoppingCart,
  DollarSign,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  CREDIT_POLICY_LABELS,
  CUSTOMER_CATEGORY_LABELS,
} from "@/lib/types";
import type { Customer, Account, SalesZone, Route } from "@/lib/types";
import { CustomerJurisdictions } from "@/components/customers/customer-jurisdictions";

interface Props {
  customer: Customer;
  account: Account | null;
  zones: SalesZone[];
  routes: Route[];
}

export function CustomerProfileTab({ customer, account, zones, routes }: Props) {
  const customerZone = customer.zoneId ? zones.find((z) => z.id === customer.zoneId) : null;
  const customerRoute = customer.routeId ? routes.find((r) => r.id === customer.routeId) : null;
  const pctCredit = customer.creditLimit > 0 && account
    ? (account.currentBalance / customer.creditLimit) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            Datos
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo</span>
              <span className="capitalize">{customer.customerType === "company" ? "Empresa" : "Persona"}</span>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.taxCondition && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cond. fiscal</span>
                <span>{customer.taxCondition}</span>
              </div>
            )}
            {customer.channel && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canal</span>
                <span className="capitalize">{customer.channel}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="size-4 text-muted-foreground" />
            Cuenta corriente
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo</span>
              <span className={cn("font-semibold tabular-nums", account && account.currentBalance > 0 ? "text-red-500" : "text-p3")}>
                {formatMoney(account?.currentBalance ?? 0)}
              </span>
            </div>
            {account && account.overdueBalance > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vencido</span>
                <span className="font-semibold tabular-nums text-red-500">{formatMoney(account.overdueBalance)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lim. credito</span>
              <span className="tabular-nums">{formatMoney(customer.creditLimit)}</span>
            </div>
            {customer.creditLimit > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credito usado</span>
                <span className={cn("tabular-nums", pctCredit > 80 ? "text-destructive" : "text-muted-foreground")}>
                  {pctCredit.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <ShoppingCart className="size-4 text-muted-foreground" />
            Resumen
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Para ver pedidos, pagos y movimientos de cuenta, navegá a las pestañas
              correspondientes.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          Política comercial
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Categoría</p>
            <p className="mt-1 font-medium">
              {customer.category
                ? CUSTOMER_CATEGORY_LABELS[customer.category]
                : "Sin clasificar"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Zona</p>
            <p className="mt-1 font-medium">
              {customerZone
                ? `${customerZone.code} — ${customerZone.name}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Ruta</p>
            <p className="mt-1 font-medium">
              {customerRoute
                ? `${customerRoute.code} — ${customerRoute.name}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">
              Política crédito
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge
                variant={
                  customer.creditPolicy === "blocked"
                    ? "destructive"
                    : customer.creditPolicy === "strict"
                      ? "default"
                      : "outline"
                }
              >
                {CREDIT_POLICY_LABELS[customer.creditPolicy]}
              </Badge>
            </div>
          </div>
          {customer.blockOnOverdue && (
            <div className="col-span-full flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
              <ShieldAlert className="size-4" />
              Bloquear pedidos cuando el saldo vencido supere{" "}
              {customer.overdueDaysThreshold} días.
              {account &&
                account.overdueBalance > 0 &&
                ` Saldo vencido actual: ${formatMoney(account.overdueBalance)}.`}
            </div>
          )}
        </div>
      </div>

      <CustomerJurisdictions customerId={customer.id} />

      {customer.contacts && customer.contacts.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-medium text-base">Contactos</h3>
          </div>
          <div className="divide-y">
            {customer.contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.position ?? ""}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {c.phone && <p>{c.phone}</p>}
                  {c.email && <p>{c.email}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {customer.addresses && customer.addresses.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-medium text-base">Direcciones</h3>
          </div>
          <div className="divide-y">
            {customer.addresses.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium capitalize">{a.type === "shipping" ? "Envío" : a.type === "billing" ? "Facturación" : a.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.street}{a.city ? `, ${a.city}` : ""}{a.province ? `, ${a.province}` : ""}
                  </p>
                </div>
                {a.type === "billing" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-p3/10 text-p3 font-medium">Facturación</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
