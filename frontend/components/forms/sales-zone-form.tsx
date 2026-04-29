"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import {
  salesZoneSchema,
  type SalesZoneFormValues,
} from "@/lib/validations/sales-zone";
import {
  createSalesZone,
  updateSalesZone,
} from "@/lib/actions/sales-zones";
import type { SalesZone } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SalesZoneFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone?: SalesZone;
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

function getDefaultValues(zone?: SalesZone): SalesZoneFormValues {
  if (!zone) {
    return { status: "active" } as SalesZoneFormValues;
  }
  return {
    code: zone.code,
    name: zone.name,
    parentZoneId: zone.parentZoneId ?? undefined,
    status: zone.status,
  } as SalesZoneFormValues;
}

export function SalesZoneForm({
  open,
  onOpenChange,
  zone,
  zones = [],
}: SalesZoneFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = !!zone;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SalesZoneFormValues>({
    resolver: standardSchemaResolver(salesZoneSchema) as any,
    defaultValues: getDefaultValues(zone),
  });

  useEffect(() => {
    if (open) reset(getDefaultValues(zone));
  }, [open, zone?.id, reset]);

  const onSubmit = handleSubmit(async (raw) => {
    setLoading(true);
    const data = Object.fromEntries(
      Object.entries(raw).filter(([_, v]) => v !== "" && v !== undefined)
    );
    try {
      if (isEdit && zone) {
        await updateSalesZone(zone.id, data);
      } else {
        await createSalesZone(data);
      }
      router.refresh();
      onOpenChange(false);
      reset(getDefaultValues());
      toast.success(isEdit ? "Zona actualizada" : "Zona creada", {
        description: raw.name,
      });
    } catch (err) {
      toast.error("Error al guardar zona", {
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

  const availableParents = zones.filter((z) => z.id !== zone?.id);

  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title={isEdit ? "Editar zona" : "Nueva zona"}
      onSubmit={onSubmit}
      loading={loading}
      submitLabel={isEdit ? "Guardar cambios" : "Crear zona"}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Código</Label>
            <Input
              {...register("code")}
              className={inputCls(!!errors.code)}
              placeholder="Z-CENTRO"
              disabled={isEdit}
            />
            <FieldError message={errors.code?.message} />
          </div>
          <div>
            <Label required>Estado</Label>
            <select
              {...register("status")}
              className={selectCls(!!errors.status)}
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>
          <div className="col-span-2">
            <Label required>Nombre</Label>
            <Input
              {...register("name")}
              className={inputCls(!!errors.name)}
              placeholder="Zona Centro"
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="col-span-2">
            <Label>Zona padre (opcional)</Label>
            <select
              {...register("parentZoneId")}
              className={selectCls(!!errors.parentZoneId)}
            >
              <option value="">Sin zona padre</option>
              {availableParents.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.code} — {z.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <Label>Descripción</Label>
            <Input
              {...register("description")}
              className={inputCls()}
              placeholder="Notas sobre la zona"
            />
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}
