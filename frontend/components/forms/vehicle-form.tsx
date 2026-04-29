"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { vehicleSchema, type VehicleFormValues } from "@/lib/validations/vehicle";
import { createVehicle, updateVehicle } from "@/lib/actions/vehicles";
import type { Vehicle } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle;
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

function getDefaultValues(vehicle?: Vehicle): VehicleFormValues {
  if (!vehicle) {
    return { status: "active" } as VehicleFormValues;
  }
  return {
    plate: vehicle.plate,
    model: vehicle.model ?? "",
    capacityKg: vehicle.capacityKg ?? undefined,
    capacityM3: vehicle.capacityM3 ?? undefined,
    status: vehicle.status,
  } as VehicleFormValues;
}

export function VehicleForm({ open, onOpenChange, vehicle }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = !!vehicle;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VehicleFormValues>({
    resolver: standardSchemaResolver(vehicleSchema) as any,
    defaultValues: getDefaultValues(vehicle),
  });

  useEffect(() => {
    if (open) reset(getDefaultValues(vehicle));
  }, [open, vehicle?.id, reset]);

  const onSubmit = handleSubmit(async (raw) => {
    setLoading(true);
    const data = Object.fromEntries(Object.entries(raw).filter(([_, v]) => v !== "" && v !== undefined));
    try {
      if (isEdit && vehicle) await updateVehicle(vehicle.id, data);
      else await createVehicle(data);
      router.refresh();
      onOpenChange(false);
      reset(getDefaultValues());
      toast.success(isEdit ? "Vehículo actualizado" : "Vehículo creado", { description: raw.plate });
    } catch (err) {
      toast.error("Error al guardar", { description: err instanceof Error ? err.message : "" });
    } finally {
      setLoading(false);
    }
  });

  const inputCls = (hasError?: boolean) => cn("h-9 text-sm", hasError && "border-destructive focus-visible:ring-destructive");
  const selectCls = () => "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <FormDrawer open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }} title={isEdit ? "Editar vehículo" : "Nuevo vehículo"} onSubmit={onSubmit} loading={loading} submitLabel={isEdit ? "Guardar cambios" : "Crear vehículo"}>
      <div className="space-y-4">
        <div>
          <Label required>Patente</Label>
          <Input {...register("plate")} className={inputCls(!!errors.plate)} placeholder="ABC-123" disabled={isEdit} />
          <FieldError message={errors.plate?.message} />
        </div>
        <div>
          <Label>Modelo</Label>
          <Input {...register("model")} className={inputCls()} placeholder="Mercedes Sprinter" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Capacidad (kg)</Label>
            <Input {...register("capacityKg")} type="number" min={0} className={inputCls()} placeholder="1500" />
          </div>
          <div>
            <Label>Capacidad (m³)</Label>
            <Input {...register("capacityM3")} type="number" min={0} step={0.01} className={inputCls()} placeholder="8.5" />
          </div>
        </div>
        <div>
          <Label>Estado</Label>
          <select {...register("status")} className={selectCls()}>
            <option value="active">Activo</option>
            <option value="maintenance">En mantenimiento</option>
            <option value="retired">De baja</option>
          </select>
        </div>
      </div>
    </FormDrawer>
  );
}
