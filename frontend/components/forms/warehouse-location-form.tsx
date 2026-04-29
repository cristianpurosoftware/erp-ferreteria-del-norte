"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import {
  warehouseLocationSchema,
  type WarehouseLocationFormValues,
} from "@/lib/validations/warehouse-location";
import {
  createWarehouseLocation,
  updateWarehouseLocation,
} from "@/lib/actions/warehouse-locations";
import { getWarehouses } from "@/lib/actions/settings";
import type { Warehouse, WarehouseLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WarehouseLocationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: WarehouseLocation;
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

function getDefaultValues(location?: WarehouseLocation): WarehouseLocationFormValues {
  if (!location) {
    return { kind: "pick", status: "active" } as WarehouseLocationFormValues;
  }
  return {
    warehouseId: location.warehouseId,
    code: location.code,
    aisle: location.aisle ?? "",
    rack: location.rack ?? "",
    shelf: location.shelf ?? "",
    bin: location.bin ?? "",
    kind: location.kind,
    status: location.status,
  } as WarehouseLocationFormValues;
}

export function WarehouseLocationForm({
  open,
  onOpenChange,
  location,
}: WarehouseLocationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Pick<Warehouse, "id" | "name">[]>([]);
  const isEdit = !!location;

  useEffect(() => {
    if (open) {
      getWarehouses().then((r) => setWarehouses(r.items)).catch(() => void 0);
    }
  }, [open]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WarehouseLocationFormValues>({
    resolver: standardSchemaResolver(warehouseLocationSchema) as any,
    defaultValues: getDefaultValues(location),
  });

  useEffect(() => {
    if (open) reset(getDefaultValues(location));
  }, [open, location?.id, reset]);

  const onSubmit = handleSubmit(async (raw) => {
    setLoading(true);
    const data = Object.fromEntries(
      Object.entries(raw).filter(([_, v]) => v !== "" && v !== undefined)
    );
    try {
      if (isEdit && location) {
        await updateWarehouseLocation(location.id, data);
      } else {
        await createWarehouseLocation(data);
      }
      router.refresh();
      onOpenChange(false);
      reset(getDefaultValues());
      toast.success(
        isEdit ? "Ubicación actualizada" : "Ubicación creada",
        { description: raw.code }
      );
    } catch (err) {
      toast.error("Error al guardar ubicación", {
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
      title={isEdit ? "Editar ubicación" : "Nueva ubicación"}
      onSubmit={onSubmit}
      loading={loading}
      submitLabel={isEdit ? "Guardar cambios" : "Crear ubicación"}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Depósito</Label>
            <select
              {...register("warehouseId")}
              className={selectCls(!!errors.warehouseId)}
              disabled={isEdit}
            >
              <option value="">Seleccioná depósito</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.warehouseId?.message} />
          </div>
          <div>
            <Label required>Tipo</Label>
            <select
              {...register("kind")}
              className={selectCls(!!errors.kind)}
            >
              <option value="pick">Pick (picking)</option>
              <option value="bulk">Bulk (bulto grande)</option>
              <option value="quarantine">Cuarentena</option>
              <option value="returns">Devoluciones</option>
              <option value="staging">Staging (preparado)</option>
            </select>
          </div>
          <div className="col-span-2">
            <Label required>Código</Label>
            <Input
              {...register("code")}
              className={inputCls(!!errors.code)}
              placeholder="A-03-07"
              disabled={isEdit}
            />
            <FieldError message={errors.code?.message} />
          </div>
          <div>
            <Label>Pasillo</Label>
            <Input {...register("aisle")} className={inputCls()} placeholder="A" />
          </div>
          <div>
            <Label>Rack</Label>
            <Input {...register("rack")} className={inputCls()} placeholder="03" />
          </div>
          <div>
            <Label>Estante</Label>
            <Input {...register("shelf")} className={inputCls()} placeholder="07" />
          </div>
          <div>
            <Label>Bin</Label>
            <Input {...register("bin")} className={inputCls()} placeholder="B1" />
          </div>
          <div className="col-span-2">
            <Label>Estado</Label>
            <select {...register("status")} className={selectCls()}>
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}
