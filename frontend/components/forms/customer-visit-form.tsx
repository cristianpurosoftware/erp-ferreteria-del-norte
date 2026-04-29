"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  customerVisitSchema,
  type CustomerVisitFormValues,
} from "@/lib/validations/customer-visit";
import { createCustomerVisit } from "@/lib/actions/customer-visits";
import { getCustomers } from "@/lib/actions/customers";
import { getRoutes } from "@/lib/actions/routes";
import type { Customer, Route } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CustomerVisitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When registering a visit from a customer page, pre-select the customer. */
  customerId?: string;
  /** When registering from a route, pre-select the route. */
  routeId?: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-foreground block mb-1.5">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

export function CustomerVisitForm({
  open,
  onOpenChange,
  customerId,
  routeId,
}: CustomerVisitFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Pick<Customer, "id" | "legalName" | "commercialName">[]>([]);
  const [routes, setRoutes] = useState<Pick<Route, "id" | "code" | "name">[]>([]);

  useEffect(() => {
    if (!open) return;
    const fetches: Promise<void>[] = [];
    if (!customerId) {
      fetches.push(getCustomers({ limit: 500 }).then((r) => setCustomers(r.items)).catch(() => void 0));
    }
    if (!routeId) {
      fetches.push(getRoutes({ limit: 500, status: "active" }).then((r) => setRoutes(r.items)).catch(() => void 0));
    }
  }, [open, customerId, routeId]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerVisitFormValues>({
    resolver: standardSchemaResolver(customerVisitSchema) as any,
    defaultValues: {
      customerId: customerId ?? "",
      routeId: routeId ?? undefined,
      result: "no_order",
    },
  });

  const onSubmit = handleSubmit(async (raw) => {
    setLoading(true);
    const data = Object.fromEntries(
      Object.entries(raw).filter(([_, v]) => v !== "" && v !== undefined)
    );
    try {
      await createCustomerVisit(data);
      router.refresh();
      onOpenChange(false);
      reset();
      toast.success("Visita registrada");
    } catch (err) {
      toast.error("Error al registrar visita", {
        description:
          err instanceof Error ? err.message : "Verificá los datos.",
      });
    } finally {
      setLoading(false);
    }
  });

  const selectCls = (hasError?: boolean) =>
    cn(
      "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
      hasError && "border-destructive focus:ring-destructive"
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar visita</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!customerId && (
            <div>
              <Label required>Cliente</Label>
              <select
                {...register("customerId")}
                className={selectCls(!!errors.customerId)}
              >
                <option value="">Seleccioná un cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.commercialName || c.legalName}
                  </option>
                ))}
              </select>
              <FieldError message={errors.customerId?.message} />
            </div>
          )}
          {!routeId && routes.length > 0 && (
            <div>
              <Label>Ruta</Label>
              <select
                {...register("routeId")}
                className={selectCls(!!errors.routeId)}
              >
                <option value="">Sin ruta</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label required>Resultado</Label>
            <select
              {...register("result")}
              className={selectCls(!!errors.result)}
            >
              <option value="ordered">Pedido tomado</option>
              <option value="no_order">Sin pedido</option>
              <option value="closed">Cerrado</option>
              <option value="absent">Ausente</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Latitud</Label>
              <Input
                {...register("lat")}
                type="number"
                step="any"
                className="h-9 text-sm"
                placeholder="-34.603"
              />
            </div>
            <div>
              <Label>Longitud</Label>
              <Input
                {...register("lng")}
                type="number"
                step="any"
                className="h-9 text-sm"
                placeholder="-58.381"
              />
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea
              {...register("notes")}
              className="text-sm min-h-[80px]"
              placeholder="Observaciones"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
