"use client";

import { useForm, Controller } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { productSchema, type ProductFormValues } from "@/lib/validations/product";
import { createProduct, updateProduct } from "@/lib/actions/products";
import type { Product, Category, Brand, Supplier } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  categories?: Category[];
  brands?: Brand[];
  suppliers?: Pick<Supplier, "id" | "name">[];
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

function getDefaultValues(product?: Product): ProductFormValues {
  if (!product) {
    return {
      status: "active",
      productType: "physical",
      controlsStock: true,
      basePrice: 0,
      baseCost: 0,
      minStock: 0,
      tracksLot: false,
      tracksSerial: false,
      reorderPoint: 0,
      leadTimeDays: 0,
    } as ProductFormValues;
  }
  return {
    sku: product.sku ?? "",
    name: product.name,
    description: product.description ?? "",
    categoryId: product.categoryId ?? "",
    brandId: product.brandId ?? "",
    unitId: product.unitId ?? "",
    productType: product.productType,
    basePrice: product.basePrice,
    baseCost: product.baseCost,
    controlsStock: product.controlsStock,
    minStock: product.minStock,
    status: product.status,
    tracksLot: product.tracksLot ?? false,
    tracksSerial: product.tracksSerial ?? false,
    shelfLifeDays: product.shelfLifeDays ?? undefined,
    reorderPoint: product.reorderPoint ?? 0,
    leadTimeDays: product.leadTimeDays ?? 0,
    preferredSupplierId: product.preferredSupplierId ?? undefined,
  } as ProductFormValues;
}

export function ProductForm({
  open,
  onOpenChange,
  product,
  categories = [],
  brands = [],
  suppliers = [],
}: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: standardSchemaResolver(productSchema) as any,
    defaultValues: getDefaultValues(product),
  });

  useEffect(() => {
    if (open) reset(getDefaultValues(product));
  }, [open, product?.id, reset]);

  const tracksLotWatch = watch("tracksLot");
  const tracksSerialWatch = watch("tracksSerial");
  // tracksSerial implies tracksLot — lot is a prerequisite for serial tracking.
  const lotDisabled = !!tracksSerialWatch;

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    try {
      if (isEdit && product) {
        await updateProduct(product.id, data);
      } else {
        await createProduct(data);
      }
      router.refresh();
      onOpenChange(false);
      reset(getDefaultValues());
      toast.success(isEdit ? "Producto actualizado" : "Producto creado", { description: data.name });
    } catch (err) {
      toast.error("Error al guardar producto", { description: err instanceof Error ? err.message : "Verificá los datos e intentá de nuevo." });
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
      title={isEdit ? "Editar producto" : "Nuevo producto"}
      onSubmit={onSubmit}
      loading={loading}
      submitLabel={isEdit ? "Guardar cambios" : "Crear producto"}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>SKU</Label>
            <Input {...register("sku")} className={inputCls(!!errors.sku)} placeholder="Ej: PROD-001" />
            <FieldError message={errors.sku?.message} />
          </div>
          <div>
            <Label>Categoría</Label>
            <select {...register("categoryId")} className={selectCls(!!errors.categoryId)}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <Label required>Nombre</Label>
            <Input {...register("name")} className={inputCls(!!errors.name)} placeholder="Nombre del producto" />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="col-span-2">
            <Label>Descripción</Label>
            <Input {...register("description")} className={inputCls()} placeholder="Descripción opcional" />
          </div>
          <div>
            <Label>Marca</Label>
            <select {...register("brandId")} className={selectCls()}>
              <option value="">Sin marca</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Tipo</Label>
            <select {...register("productType")} className={selectCls()}>
              <option value="physical">Físico</option>
              <option value="service">Servicio</option>
              <option value="digital">Digital</option>
            </select>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-3">Precios</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Costo base</Label>
              <Input {...register("baseCost")} type="number" min={0} step={0.01} className={inputCls(!!errors.baseCost)} placeholder="0.00" />
              <FieldError message={errors.baseCost?.message} />
            </div>
            <div>
              <Label required>Precio base</Label>
              <Input {...register("basePrice")} type="number" min={0} step={0.01} className={inputCls(!!errors.basePrice)} placeholder="0.00" />
              <FieldError message={errors.basePrice?.message} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Stock mínimo</Label>
            <Input {...register("minStock")} type="number" min={0} className={inputCls(!!errors.minStock)} placeholder="0" />
            <FieldError message={errors.minStock?.message} />
          </div>
          <div>
            <Label>Estado</Label>
            <select {...register("status")} className={selectCls()}>
              <option value="active">Activo</option>
              <option value="draft">Borrador</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>

        {/* Trazabilidad (Fase 2) */}
        <div className="pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
            Trazabilidad
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex items-start gap-2">
              <Controller
                control={control}
                name="tracksLot"
                render={({ field }) => (
                  <Checkbox
                    id="tracksLot"
                    checked={!!field.value || lotDisabled}
                    disabled={lotDisabled}
                    onCheckedChange={(c) => field.onChange(!!c)}
                  />
                )}
              />
              <label
                htmlFor="tracksLot"
                className="text-sm leading-tight cursor-pointer"
              >
                Trazabilidad por lote
                <span className="block text-xs text-muted-foreground">
                  {lotDisabled
                    ? "Obligatorio mientras esté activa la trazabilidad por serie."
                    : "Cada recepción genera un lote. Consumo FEFO (primero el que vence antes)."}
                </span>
              </label>
            </div>
            <div className="col-span-2 flex items-start gap-2">
              <Controller
                control={control}
                name="tracksSerial"
                render={({ field }) => (
                  <Checkbox
                    id="tracksSerial"
                    checked={!!field.value}
                    onCheckedChange={(c) => {
                      const next = !!c;
                      field.onChange(next);
                      // Enforce invariant: serial requires lot.
                      if (next) setValue("tracksLot", true);
                    }}
                  />
                )}
              />
              <label
                htmlFor="tracksSerial"
                className="text-sm leading-tight cursor-pointer"
              >
                Trazabilidad por número de serie
                <span className="block text-xs text-muted-foreground">
                  Implica trazabilidad por lote. Cada unidad tiene un serial
                  único.
                </span>
              </label>
            </div>
            {tracksLotWatch && (
              <div className="col-span-2">
                <Label>Vida útil (días)</Label>
                <Input
                  {...register("shelfLifeDays")}
                  type="number"
                  min={0}
                  className={inputCls(!!errors.shelfLifeDays)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Para alertar lotes por vencer antes de esta cantidad de días.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reposición (Fase 2) */}
        <div className="pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
            Reposición
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Punto de reorden</Label>
              <Input
                {...register("reorderPoint")}
                type="number"
                min={0}
                className={inputCls(!!errors.reorderPoint)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Lead time (días)</Label>
              <Input
                {...register("leadTimeDays")}
                type="number"
                min={0}
                className={inputCls(!!errors.leadTimeDays)}
                placeholder="7"
              />
            </div>
            <div className="col-span-2">
              <Label>Proveedor preferido</Label>
              <select
                {...register("preferredSupplierId")}
                className={selectCls()}
              >
                <option value="">Sin asignar</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}
