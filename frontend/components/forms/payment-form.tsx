"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { paymentSchema, type PaymentFormValues } from "@/lib/validations/payment";
import { createPayment } from "@/lib/actions/collections";
import { getChecks } from "@/lib/actions/treasury";
import type { Customer, Check } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Pick<Customer, "id" | "legalName" | "commercialName">[];
  fixedCustomerId?: string;
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

export function PaymentForm({ open, onOpenChange, customers, fixedCustomerId }: PaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [availableChecks, setAvailableChecks] = useState<Check[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: standardSchemaResolver(paymentSchema) as any,
    defaultValues: {
      customerId: fixedCustomerId ?? "",
      type: "incoming",
      paymentMethod: "cash",
      amount: 0,
      currency: "ARS",
    },
  });

  const methodWatch = watch("paymentMethod");
  const isCheck = methodWatch === "check_third" || methodWatch === "check_own";

  // Load available received/in-portfolio checks when method becomes check.
  useEffect(() => {
    if (!isCheck) {
      setAvailableChecks([]);
      return;
    }
    getChecks({ status: "received", limit: 100 })
      .then((r) => setAvailableChecks(r.items))
      .catch(() => setAvailableChecks([]));
  }, [isCheck]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    try {
      await createPayment(data);
      router.refresh();
      onOpenChange(false);
      reset();
      toast.success("Pago registrado", {
        description: `${formatMoney(Number(data.amount))} · ${data.paymentMethod}`,
      });
    } catch (err) {
      toast.error("Error al registrar pago", {
        description: err instanceof Error ? err.message : "",
      });
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
      title="Registrar pago"
      onSubmit={onSubmit}
      loading={loading}
      submitLabel="Registrar pago"
    >
      <div className="space-y-4">
        {!fixedCustomerId && (
          <div>
            <Label required>Cliente</Label>
            <select {...register("customerId")} className={selectCls(!!errors.customerId)}>
              <option value="">Seleccionar cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.commercialName || c.legalName}
                </option>
              ))}
            </select>
            <FieldError message={errors.customerId?.message} />
          </div>
        )}

        <div>
          <Label required>Monto</Label>
          <Input
            {...register("amount")}
            type="number"
            min={0}
            step={0.01}
            className={inputCls(!!errors.amount)}
            placeholder="0.00"
          />
          <FieldError message={errors.amount?.message} />
        </div>

        <div>
          <Label required>Forma de pago</Label>
          <select {...register("paymentMethod")} className={selectCls(!!errors.paymentMethod)}>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="check_third">Cheque de tercero</option>
            <option value="check_own">Cheque propio</option>
            <option value="digital">Digital</option>
          </select>
          <FieldError message={errors.paymentMethod?.message} />
        </div>

        {isCheck && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <Label>Cheque asociado</Label>
            {availableChecks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No hay cheques en estado "recibido". Cargalos desde{" "}
                <a href="/tesoreria/cheques" className="underline hover:text-foreground">
                  Tesorería → Cheques
                </a>
                {" "}o dejalo vacío y se cargará solo como pago (sin asociar cheque).
              </p>
            ) : (
              <select {...register("checkId")} className={selectCls(!!errors.checkId)}>
                <option value="">Sin asociar</option>
                {availableChecks.map((c) => (
                  <option key={c.id} value={c.id}>
                    N° {c.number}
                    {c.bankName ? ` · ${c.bankName}` : ""}
                    {" · "}
                    {formatMoney(Number(c.amount))}
                    {c.dueDate ? ` · vence ${c.dueDate.slice(0, 10)}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <Label>Referencia externa</Label>
          <Input
            {...register("externalReference")}
            className={inputCls()}
            placeholder="N° de transferencia, cheque, etc."
          />
        </div>

        <div>
          <Label>Notas</Label>
          <Input
            {...register("notes")}
            className={inputCls()}
            placeholder="Notas adicionales"
          />
        </div>
      </div>
    </FormDrawer>
  );
}
