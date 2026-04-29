"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { driverSchema, type DriverFormValues } from "@/lib/validations/driver";
import { createDriver, updateDriver } from "@/lib/actions/drivers";
import type { Driver, User } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver;
  users?: Pick<User, "id" | "first_name" | "last_name">[];
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

function getDefaultValues(driver?: Driver): DriverFormValues {
  if (!driver) {
    return { status: "active" } as DriverFormValues;
  }
  return {
    userId: driver.userId ?? undefined,
    fullName: driver.fullName,
    dni: driver.dni ?? "",
    licenseNumber: driver.licenseNumber ?? "",
    licenseExpires: driver.licenseExpires ?? undefined,
    phone: driver.phone ?? "",
    status: driver.status,
  } as DriverFormValues;
}

export function DriverForm({ open, onOpenChange, driver, users = [] }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = !!driver;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DriverFormValues>({
    resolver: standardSchemaResolver(driverSchema) as any,
    defaultValues: getDefaultValues(driver),
  });

  useEffect(() => {
    if (open) reset(getDefaultValues(driver));
  }, [open, driver?.id, reset]);

  const onSubmit = handleSubmit(async (raw) => {
    setLoading(true);
    const data = Object.fromEntries(Object.entries(raw).filter(([_, v]) => v !== "" && v !== undefined));
    try {
      if (isEdit && driver) await updateDriver(driver.id, data);
      else await createDriver(data);
      router.refresh();
      onOpenChange(false);
      reset(getDefaultValues());
      toast.success(isEdit ? "Chofer actualizado" : "Chofer creado", { description: raw.fullName });
    } catch (err) {
      toast.error("Error al guardar", { description: err instanceof Error ? err.message : "" });
    } finally {
      setLoading(false);
    }
  });

  const inputCls = (e?: boolean) => cn("h-9 text-sm", e && "border-destructive focus-visible:ring-destructive");
  const selectCls = () => "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <FormDrawer open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }} title={isEdit ? "Editar chofer" : "Nuevo chofer"} onSubmit={onSubmit} loading={loading} submitLabel={isEdit ? "Guardar cambios" : "Crear chofer"}>
      <div className="space-y-4">
        <div>
          <Label required>Nombre completo</Label>
          <Input {...register("fullName")} className={inputCls(!!errors.fullName)} placeholder="Juan Pérez" />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>DNI</Label>
            <Input {...register("dni")} className={inputCls()} placeholder="30123456" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input {...register("phone")} className={inputCls()} placeholder="11-4444-5555" />
          </div>
          <div>
            <Label>Número de licencia</Label>
            <Input {...register("licenseNumber")} className={inputCls()} placeholder="B1-12345678" />
          </div>
          <div>
            <Label>Vencimiento licencia</Label>
            <Input {...register("licenseExpires")} type="date" className={inputCls()} />
          </div>
        </div>
        <div>
          <Label>Usuario asociado</Label>
          <select {...register("userId")} className={selectCls()}>
            <option value="">Sin usuario</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
          </select>
        </div>
        <div>
          <Label>Estado</Label>
          <select {...register("status")} className={selectCls()}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>
    </FormDrawer>
  );
}
