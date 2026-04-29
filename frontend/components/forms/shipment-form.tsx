"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { shipmentSchema, type ShipmentFormValues } from "@/lib/validations/shipment";
import { createShipment, updateShipment } from "@/lib/actions/shipments";
import type { Vehicle, Driver, Warehouse, DispatchSheet, Shipment } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Pick<Warehouse, "id" | "name">[];
  vehicles: Pick<Vehicle, "id" | "plate">[];
  drivers: Pick<Driver, "id" | "fullName">[];
  dispatchSheets?: Pick<DispatchSheet, "id" | "date">[];
  /** Edit mode when provided. */
  shipment?: Shipment;
}

function FieldError({ message }: { message?: string }) { if (!message) return null; return <p className="text-xs text-destructive mt-1">{message}</p>; }
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className="text-sm font-medium block mb-1.5">{children}{required && <span className="text-destructive ml-0.5">*</span>}</label>;
}

function getDefaultValues(shipment?: Shipment): ShipmentFormValues {
  if (!shipment) {
    return { plannedDate: new Date().toISOString().split("T")[0] } as ShipmentFormValues;
  }
  return {
    warehouseId: shipment.warehouseId,
    vehicleId: shipment.vehicleId ?? undefined,
    driverId: shipment.driverId ?? undefined,
    dispatchSheetId: shipment.dispatchSheetId ?? undefined,
    plannedDate: shipment.plannedDate.slice(0, 10),
  } as ShipmentFormValues;
}

export function ShipmentForm({ open, onOpenChange, warehouses, vehicles, drivers, dispatchSheets = [], shipment }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = !!shipment;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ShipmentFormValues>({
    resolver: standardSchemaResolver(shipmentSchema) as any,
    defaultValues: getDefaultValues(shipment),
  });

  useEffect(() => {
    if (open) reset(getDefaultValues(shipment));
  }, [open, shipment?.id, reset]);

  const onSubmit = handleSubmit(async (raw) => {
    setLoading(true);
    const data = Object.fromEntries(Object.entries(raw).filter(([_, v]) => v !== "" && v !== undefined));
    try {
      if (isEdit && shipment) {
        const updated = await updateShipment(shipment.id, data);
        toast.success("Envío actualizado", {
          description: `${updated.plannedDate.slice(0, 10)} · ${updated.vehiclePlate ?? "sin vehículo"}`,
        });
      } else {
        const created = await createShipment(data);
        toast.success("Envío creado", {
          description: `${created.plannedDate.slice(0, 10)} · ${created.vehiclePlate ?? "sin vehículo"}`,
        });
      }
      router.refresh();
      onOpenChange(false);
      reset(getDefaultValues());
    } catch (err) {
      toast.error(isEdit ? "Error al actualizar envío" : "Error al crear envío", { description: err instanceof Error ? err.message : "" });
    } finally {
      setLoading(false);
    }
  });

  const inputCls = (e?: boolean) => cn("h-9 text-sm", e && "border-destructive focus-visible:ring-destructive");
  const selectCls = (e?: boolean) => cn("h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring", e && "border-destructive focus:ring-destructive");

  return (
    <FormDrawer open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }} title={isEdit ? "Editar envío" : "Nuevo envío"} onSubmit={onSubmit} loading={loading} submitLabel={isEdit ? "Guardar cambios" : "Crear envío"}>
      <div className="space-y-4">
        <div>
          <Label required>Depósito</Label>
          <select {...register("warehouseId")} className={selectCls(!!errors.warehouseId)}>
            <option value="">Seleccioná depósito</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <FieldError message={errors.warehouseId?.message} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Vehículo</Label>
            <select {...register("vehicleId")} className={selectCls()}>
              <option value="">Sin asignar</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
            </select>
          </div>
          <div>
            <Label>Chofer</Label>
            <select {...register("driverId")} className={selectCls()}>
              <option value="">Sin asignar</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </select>
          </div>
        </div>
        <div>
          <Label>Hoja de ruta</Label>
          <select {...register("dispatchSheetId")} className={selectCls()}>
            <option value="">Sin hoja de ruta</option>
            {dispatchSheets.map((ds) => <option key={ds.id} value={ds.id}>{ds.date.slice(0, 10)}</option>)}
          </select>
        </div>
        <div>
          <Label required>Fecha planificada</Label>
          <Input {...register("plannedDate")} type="date" className={inputCls(!!errors.plannedDate)} />
          <FieldError message={errors.plannedDate?.message} />
        </div>
      </div>
    </FormDrawer>
  );
}
