"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { lotSchema, type LotFormValues } from "@/lib/validations/lot";
import { createLot } from "@/lib/actions/lots";
import type { Product, Supplier } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LotFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select the product when opening from a product detail page. */
  productId?: string;
  products: Pick<Product, "id" | "sku" | "name" | "tracksLot">[];
  suppliers?: Pick<Supplier, "id" | "name">[];
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

export function LotForm({
  open,
  onOpenChange,
  productId,
  products,
  suppliers = [],
}: LotFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const trackedProducts = products.filter((p) => p.tracksLot);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LotFormValues>({
    resolver: standardSchemaResolver(lotSchema) as any,
    defaultValues: { productId: productId ?? "" },
  });

  const onSubmit = handleSubmit(async (raw) => {
    setLoading(true);
    const data = Object.fromEntries(
      Object.entries(raw).filter(([_, v]) => v !== "" && v !== undefined)
    );
    try {
      await createLot(data);
      router.refresh();
      onOpenChange(false);
      reset();
      toast.success("Lote creado", { description: raw.code });
    } catch (err) {
      toast.error("Error al crear lote", {
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
      title="Nuevo lote"
      onSubmit={onSubmit}
      loading={loading}
      submitLabel="Crear lote"
    >
      <div className="space-y-4">
        <div>
          <Label required>Producto</Label>
          <select
            {...register("productId")}
            className={selectCls(!!errors.productId)}
            disabled={!!productId}
          >
            <option value="">Seleccioná un producto con trazabilidad</option>
            {trackedProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku ? `${p.sku} — ` : ""}
                {p.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.productId?.message} />
          {trackedProducts.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Activá "Trazabilidad por lote" en el producto antes de crear un lote.
            </p>
          )}
        </div>
        <div>
          <Label required>Código del lote</Label>
          <Input
            {...register("code")}
            className={inputCls(!!errors.code)}
            placeholder="L-2026-0042"
          />
          <FieldError message={errors.code?.message} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha de fabricación</Label>
            <Input
              {...register("manufactureDate")}
              type="date"
              className={inputCls(!!errors.manufactureDate)}
            />
          </div>
          <div>
            <Label>Fecha de vencimiento</Label>
            <Input
              {...register("expirationDate")}
              type="date"
              className={inputCls(!!errors.expirationDate)}
            />
          </div>
        </div>
        <div>
          <Label>Proveedor</Label>
          <select {...register("supplierId")} className={selectCls()}>
            <option value="">Sin proveedor</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Recibido el</Label>
          <Input
            {...register("receivedAt")}
            type="date"
            className={inputCls()}
          />
        </div>
      </div>
    </FormDrawer>
  );
}
