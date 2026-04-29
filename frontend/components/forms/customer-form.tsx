"use client";

import { useForm, Controller } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { customerSchema, type CustomerFormValues } from "@/lib/validations/customer";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import type { Customer, Route, SalesZone, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  sellers?: Pick<User, "id" | "first_name" | "last_name">[];
  zones?: Pick<SalesZone, "id" | "code" | "name">[];
  routes?: Pick<Route, "id" | "code" | "name" | "zoneId">[];
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-foreground block mb-1.5">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

function getDefaultValues(customer?: Customer): CustomerFormValues {
  if (!customer) {
    return {
      customerType: "company",
      legalName: "",
      creditLimit: 0,
      creditPolicy: "normal",
      blockOnOverdue: false,
      overdueDaysThreshold: 0,
    } as CustomerFormValues;
  }
  return {
    customerType: customer.customerType,
    legalName: customer.legalName,
    commercialName: customer.commercialName ?? "",
    taxId: customer.taxId ?? "",
    taxCondition: customer.taxCondition ?? "",
    channel: customer.channel ?? "",
    assignedSellerId: customer.assignedSellerId ?? "",
    priceListId: customer.priceListId ?? "",
    creditLimit: customer.creditLimit,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    category: customer.category ?? undefined,
    zoneId: customer.zoneId ?? undefined,
    routeId: customer.routeId ?? undefined,
    creditPolicy: customer.creditPolicy ?? "normal",
    blockOnOverdue: customer.blockOnOverdue ?? false,
    overdueDaysThreshold: customer.overdueDaysThreshold ?? 0,
  } as CustomerFormValues;
}

export function CustomerForm({
  open,
  onOpenChange,
  customer,
  sellers = [],
  zones = [],
  routes = [],
}: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: standardSchemaResolver(customerSchema) as any,
    defaultValues: getDefaultValues(customer),
  });

  useEffect(() => {
    if (open) reset(getDefaultValues(customer));
  }, [open, customer?.id, reset]);

  const selectedZone = watch("zoneId");
  const routesForZone = selectedZone
    ? routes.filter((r) => r.zoneId === selectedZone)
    : routes;

  const onSubmit = handleSubmit(async (raw) => {
    setLoading(true);
    // Limpiar strings vacíos de campos opcionales para evitar fallas de validación UUID
    const data = Object.fromEntries(
      Object.entries(raw).filter(([_, v]) => v !== "" && v !== undefined)
    ) as typeof raw;
    try {
      if (isEdit && customer) {
        await updateCustomer(customer.id, data);
      } else {
        await createCustomer(data);
      }
      router.refresh();
      onOpenChange(false);
      reset(getDefaultValues());
      toast.success(isEdit ? "Cliente actualizado" : "Cliente creado", {
        description: `${data.commercialName || data.legalName}`,
      });
    } catch (err) {
      toast.error("Error al guardar cliente", { description: err instanceof Error ? err.message : "Verificá los datos e intentá de nuevo." });
    } finally {
      setLoading(false);
    }
  });

  const inputCls = (hasError?: boolean) =>
    cn("h-9 text-sm", hasError && "border-destructive focus-visible:ring-destructive");

  const selectCls = (hasError?: boolean) =>
    cn(
      "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
      hasError && "border-destructive focus:ring-destructive"
    );

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar cliente" : "Nuevo cliente"}
      onSubmit={onSubmit}
      loading={loading}
      submitLabel={isEdit ? "Guardar cambios" : "Crear cliente"}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Tipo</Label>
            <select {...register("customerType")} className={selectCls(!!errors.customerType)}>
              <option value="company">Empresa</option>
              <option value="individual">Persona</option>
            </select>
          </div>
          <div>
            <Label>Identificación fiscal</Label>
            <Input {...register("taxId")} className={inputCls(!!errors.taxId)} placeholder="CUIT / DNI" />
            <FieldError message={errors.taxId?.message} />
          </div>
          <div className="col-span-2">
            <Label required>Razón social</Label>
            <Input {...register("legalName")} className={inputCls(!!errors.legalName)} placeholder="Razón social" />
            <FieldError message={errors.legalName?.message} />
          </div>
          <div className="col-span-2">
            <Label>Nombre comercial</Label>
            <Input {...register("commercialName")} className={inputCls()} placeholder="Nombre comercial (opcional)" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input {...register("phone")} className={inputCls()} placeholder="11-4444-5555" />
          </div>
          <div>
            <Label>Email</Label>
            <Input {...register("email")} type="email" className={inputCls(!!errors.email)} placeholder="cliente@email.com" />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label>Condición fiscal</Label>
            <select {...register("taxCondition")} className={selectCls()}>
              <option value="">Sin especificar</option>
              <option value="Responsable Inscripto">Responsable Inscripto</option>
              <option value="Monotributo">Monotributo</option>
              <option value="Exento">Exento</option>
              <option value="Consumidor Final">Consumidor Final</option>
            </select>
          </div>
          <div>
            <Label>Canal</Label>
            <select {...register("channel")} className={selectCls()}>
              <option value="">Sin especificar</option>
              <option value="Mayorista">Mayorista</option>
              <option value="Minorista">Minorista</option>
              <option value="Mostrador">Mostrador</option>
              <option value="Gastronomia">Gastronomía</option>
              <option value="Ecommerce">E-commerce</option>
            </select>
          </div>
          <div>
            <Label>Vendedor asignado</Label>
            <select {...register("assignedSellerId")} className={selectCls()}>
              <option value="">Sin asignar</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Límite de crédito</Label>
            <Input
              {...register("creditLimit")}
              type="number"
              min={0}
              className={inputCls(!!errors.creditLimit)}
              placeholder="0"
            />
            <FieldError message={errors.creditLimit?.message} />
          </div>
        </div>

        {/* Clasificación comercial (Fase 1) */}
        <div className="pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
            Clasificación comercial
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoría</Label>
              <select {...register("category")} className={selectCls()}>
                <option value="">Sin clasificar</option>
                <option value="A">A — Clave</option>
                <option value="B">B — Regular</option>
                <option value="C">C — Ocasional</option>
              </select>
            </div>
            <div>
              <Label>Política de crédito</Label>
              <select
                {...register("creditPolicy")}
                className={selectCls(!!errors.creditPolicy)}
              >
                <option value="normal">Normal</option>
                <option value="strict">Estricta (valida límite)</option>
                <option value="blocked">Bloqueado</option>
              </select>
            </div>
            <div>
              <Label>Zona</Label>
              <select {...register("zoneId")} className={selectCls()}>
                <option value="">Sin zona</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.code} — {z.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Ruta</Label>
              <select {...register("routeId")} className={selectCls()}>
                <option value="">Sin ruta</option>
                {routesForZone.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-start gap-2 pt-1">
              <Controller
                control={control}
                name="blockOnOverdue"
                render={({ field }) => (
                  <Checkbox
                    id="blockOnOverdue"
                    checked={!!field.value}
                    onCheckedChange={(c) => field.onChange(!!c)}
                  />
                )}
              />
              <label
                htmlFor="blockOnOverdue"
                className="text-sm leading-tight cursor-pointer"
              >
                Bloquear cuando tenga saldo vencido
                <span className="block text-xs text-muted-foreground">
                  No permite confirmar pedidos si el cliente supera el umbral de
                  días vencidos.
                </span>
              </label>
            </div>
            <div>
              <Label>Umbral días vencidos</Label>
              <Input
                {...register("overdueDaysThreshold")}
                type="number"
                min={0}
                className={inputCls(!!errors.overdueDaysThreshold)}
                placeholder="0"
              />
              <FieldError message={errors.overdueDaysThreshold?.message} />
            </div>
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}
