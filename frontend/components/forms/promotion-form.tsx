"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import {
  promotionSchema,
  type PromotionFormValues,
} from "@/lib/validations/promotion";
import {
  createPromotion,
  updatePromotion,
} from "@/lib/actions/promotions";
import type { Promotion, SalesZone } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PromotionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion?: Promotion;
  zones?: SalesZone[];
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

function getDefaultValues(promotion?: Promotion): PromotionFormValues {
  if (!promotion) {
    return {
      kind: "discount_pct",
      priority: 0,
    } as PromotionFormValues;
  }
  return {
    code: promotion.code,
    name: promotion.name,
    kind: promotion.kind,
    validFrom: promotion.validFrom ?? undefined,
    validTo: promotion.validTo ?? undefined,
    channel: promotion.channel ?? undefined,
    customerCategory: promotion.customerCategory ?? undefined,
    zoneId: promotion.zoneId ?? undefined,
    priority: promotion.priority ?? 0,
  } as PromotionFormValues;
}

export function PromotionForm({
  open,
  onOpenChange,
  promotion,
  zones = [],
}: PromotionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = !!promotion;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PromotionFormValues>({
    resolver: standardSchemaResolver(promotionSchema) as any,
    defaultValues: getDefaultValues(promotion),
  });

  useEffect(() => {
    if (open) reset(getDefaultValues(promotion));
  }, [open, promotion?.id, reset]);

  const onSubmit = handleSubmit(async (raw) => {
    setLoading(true);
    const data = Object.fromEntries(
      Object.entries(raw).filter(([_, v]) => v !== "" && v !== undefined)
    );
    try {
      if (isEdit && promotion) {
        await updatePromotion(promotion.id, data);
      } else {
        await createPromotion(data);
      }
      router.refresh();
      onOpenChange(false);
      reset(getDefaultValues());
      toast.success(isEdit ? "Promoción actualizada" : "Promoción creada", {
        description: raw.name,
      });
    } catch (err) {
      toast.error("Error al guardar promoción", {
        description:
          err instanceof Error ? err.message : "Verificá los datos.",
      });
    } finally {
      setLoading(false);
    }
  });

  const inputCls = (hasError?: boolean) =>
    cn(
      "h-9 text-sm",
      hasError && "border-destructive focus-visible:ring-destructive"
    );

  const selectCls = (hasError?: boolean) =>
    cn(
      "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
      hasError && "border-destructive focus:ring-destructive"
    );

  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title={isEdit ? "Editar promoción" : "Nueva promoción"}
      onSubmit={onSubmit}
      loading={loading}
      submitLabel={isEdit ? "Guardar cambios" : "Crear promoción"}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Código</Label>
            <Input
              {...register("code")}
              className={inputCls(!!errors.code)}
              placeholder="PROMO-ENERO"
              disabled={isEdit}
            />
            <FieldError message={errors.code?.message} />
          </div>
          <div>
            <Label required>Tipo</Label>
            <select
              {...register("kind")}
              className={selectCls(!!errors.kind)}
            >
              <option value="discount_pct">Descuento %</option>
              <option value="discount_amount">Descuento $</option>
              <option value="nx+m">N x M (lleva M paga N)</option>
              <option value="combo">Combo</option>
              <option value="price_override">Precio fijo</option>
            </select>
          </div>
          <div className="col-span-2">
            <Label required>Nombre</Label>
            <Input
              {...register("name")}
              className={inputCls(!!errors.name)}
              placeholder="Promo enero 10% gaseosas"
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <Label>Desde</Label>
            <Input
              {...register("validFrom")}
              type="date"
              className={inputCls()}
            />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input
              {...register("validTo")}
              type="date"
              className={inputCls()}
            />
          </div>
          <div>
            <Label>Canal</Label>
            <select {...register("channel")} className={selectCls()}>
              <option value="">Todos</option>
              <option value="Mayorista">Mayorista</option>
              <option value="Minorista">Minorista</option>
              <option value="Mostrador">Mostrador</option>
              <option value="Gastronomia">Gastronomía</option>
              <option value="Ecommerce">E-commerce</option>
            </select>
          </div>
          <div>
            <Label>Categoría cliente</Label>
            <select {...register("customerCategory")} className={selectCls()}>
              <option value="">Todas</option>
              <option value="A">A — Clave</option>
              <option value="B">B — Regular</option>
              <option value="C">C — Ocasional</option>
            </select>
          </div>
          <div>
            <Label>Zona</Label>
            <select {...register("zoneId")} className={selectCls()}>
              <option value="">Todas</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.code} — {z.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Prioridad</Label>
            <Input
              {...register("priority")}
              type="number"
              className={inputCls(!!errors.priority)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Cantidad mínima</Label>
            <Input
              {...register("minQty")}
              type="number"
              min={1}
              className={inputCls(!!errors.minQty)}
              placeholder="Opcional"
            />
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}
