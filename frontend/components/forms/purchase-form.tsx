"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { FormDrawer } from "@/components/forms/form-drawer";
import { createPurchaseOrder, updatePurchaseOrder } from "@/lib/actions/purchases";

interface PurchaseFormValues {
  supplierId: string;
  notes: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
}

interface PurchaseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Array<{ id: string; name: string }>;
  products?: Array<{ id: string; name: string; sku?: string }>;
  mode?: "create" | "edit";
  purchaseOrderId?: string;
  initialValues?: {
    supplierId: string;
    notes: string;
    items: Array<{ productId: string; quantity: number; unitCost: number }>;
  };
}

const DEFAULT_VALUES: PurchaseFormValues = {
  supplierId: "",
  notes: "",
  items: [{ productId: "", quantity: 1, unitCost: 0 }],
};

export function PurchaseForm({
  open,
  onOpenChange,
  suppliers,
  products = [],
  mode = "create",
  purchaseOrderId,
  initialValues,
}: PurchaseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, reset, setValue, watch } = useForm<PurchaseFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    if (open && mode === "edit" && initialValues) {
      reset(initialValues);
    } else if (!open) {
      reset(DEFAULT_VALUES);
    }
  }, [open, mode, initialValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    if (!data.supplierId || data.items.length === 0) return;
    setLoading(true);
    try {
      const items = data.items.filter((i) => i.productId).map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
      }));

      if (mode === "edit" && purchaseOrderId) {
        await updatePurchaseOrder(purchaseOrderId, {
          supplierId: data.supplierId,
          notes: data.notes || null,
          items,
        });
        router.refresh();
        onOpenChange(false);
        toast.success("Orden de compra actualizada");
      } else {
        await createPurchaseOrder({
          supplierId: data.supplierId,
          notes: data.notes || undefined,
          items,
        });
        router.refresh();
        reset();
        onOpenChange(false);
        toast.success("Orden de compra creada");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verificá los datos e intentá de nuevo.";
      toast.error(mode === "edit" ? "Error al actualizar orden de compra" : "Error al crear orden de compra", {
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => { if (!o) reset(DEFAULT_VALUES); onOpenChange(o); }}
      title={mode === "edit" ? "Editar orden de compra" : "Nueva orden de compra"}
      onSubmit={onSubmit}
      loading={loading}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Proveedor</Label>
          <Select value={watch("supplierId")} onValueChange={(v) => setValue("supplierId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar proveedor..." />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => append({ productId: "", quantity: 1, unitCost: 0 })}
            >
              <Plus className="size-3" />
              Agregar
            </Button>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Producto</Label>
                <select
                  {...register(`items.${index}.productId`)}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Seleccionar...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.sku ? `${p.sku} — ` : ""}{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs">Cant.</Label>
                <Input {...register(`items.${index}.quantity`, { valueAsNumber: true })} type="number" min={1} className="h-8 text-sm" />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Costo</Label>
                <Input {...register(`items.${index}.unitCost`, { valueAsNumber: true })} type="number" min={0} step={0.01} className="h-8 text-sm" />
              </div>
              {fields.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => remove(index)}>
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea {...register("notes")} placeholder="Notas adicionales..." rows={3} />
        </div>
      </div>
    </FormDrawer>
  );
}
