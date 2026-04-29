"use client";

import { useForm, Controller } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { routeSchema, type RouteFormValues } from "@/lib/validations/route";
import { createRoute, updateRoute } from "@/lib/actions/routes";
import { getSalesZones } from "@/lib/actions/sales-zones";
import { getTeam } from "@/lib/actions/team";
import type { Route, SalesZone, User } from "@/lib/types";
import { WEEKDAY_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RouteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route?: Route;
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

function getDefaultValues(route?: Route): RouteFormValues {
  if (!route) {
    return {
      frequency: "weekly",
      weekdays: [],
      status: "active",
    } as unknown as RouteFormValues;
  }
  return {
    code: route.code,
    name: route.name,
    zoneId: route.zoneId ?? undefined,
    defaultSellerId: route.defaultSellerId ?? undefined,
    defaultDriverId: route.defaultDriverId ?? undefined,
    frequency: route.frequency ?? "weekly",
    weekdays: route.weekdays ?? [],
    status: (route.status as "active" | "inactive") ?? "active",
  } as RouteFormValues;
}

export function RouteForm({
  open,
  onOpenChange,
  route,
}: RouteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<SalesZone[]>([]);
  const [teamMembers, setTeamMembers] = useState<Pick<User, "id" | "first_name" | "last_name">[]>([]);
  const isEdit = !!route;

  useEffect(() => {
    if (open) {
      Promise.all([
        getSalesZones({ limit: 500 }),
        getTeam({ limit: 100 }),
      ])
        .then(([z, t]) => { setZones(z.items); setTeamMembers(t.items); })
        .catch(() => void 0);
    }
  }, [open]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RouteFormValues>({
    resolver: standardSchemaResolver(routeSchema) as any,
    defaultValues: getDefaultValues(route),
  });

  useEffect(() => {
    if (open) reset(getDefaultValues(route));
  }, [open, route?.id, reset]);

  const onSubmit = handleSubmit(async (raw) => {
    setLoading(true);
    const data = Object.fromEntries(
      Object.entries(raw).filter(
        ([_, v]) => v !== "" && v !== undefined && !(Array.isArray(v) && v.length === 0)
      )
    );
    try {
      if (isEdit && route) {
        await updateRoute(route.id, data);
      } else {
        await createRoute(data);
      }
      router.refresh();
      onOpenChange(false);
      reset(getDefaultValues());
      toast.success(isEdit ? "Ruta actualizada" : "Ruta creada", {
        description: raw.name,
      });
    } catch (err) {
      toast.error("Error al guardar ruta", {
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
      title={isEdit ? "Editar ruta" : "Nueva ruta"}
      onSubmit={onSubmit}
      loading={loading}
      submitLabel={isEdit ? "Guardar cambios" : "Crear ruta"}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Código</Label>
            <Input
              {...register("code")}
              className={inputCls(!!errors.code)}
              placeholder="R-NORTE"
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
              placeholder="Ruta Norte — Lunes"
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <Label>Zona</Label>
            <select
              {...register("zoneId")}
              className={selectCls(!!errors.zoneId)}
            >
              <option value="">Sin zona</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.code} — {z.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Frecuencia</Label>
            <select
              {...register("frequency")}
              className={selectCls(!!errors.frequency)}
            >
              <option value="daily">Diaria</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
              <option value="monthly">Mensual</option>
              <option value="custom">Personalizada</option>
            </select>
          </div>
          <div>
            <Label>Vendedor por defecto</Label>
            <select {...register("defaultSellerId")} className={selectCls()}>
              <option value="">Sin asignar</option>
              {teamMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Chofer por defecto</Label>
            <select {...register("defaultDriverId")} className={selectCls()}>
              <option value="">Sin asignar</option>
              {teamMembers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.first_name} {d.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <Label>Días de la semana</Label>
            <Controller
              control={control}
              name="weekdays"
              render={({ field }) => {
                const value = field.value ?? [];
                return (
                  <div className="flex flex-wrap gap-3">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                      const checked = value.includes(d);
                      return (
                        <label
                          key={d}
                          className="flex items-center gap-1.5 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => {
                              const next = c
                                ? [...value, d].sort()
                                : value.filter((v) => v !== d);
                              field.onChange(next);
                            }}
                          />
                          <span>{WEEKDAY_LABELS[d]}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}
