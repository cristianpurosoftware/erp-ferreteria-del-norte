"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  routeVisitSchema,
  type RouteVisitFormValues,
} from "@/lib/validations/route";
import { addRouteVisit } from "@/lib/actions/routes";
import { getCustomers } from "@/lib/actions/customers";
import type { Customer } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RouteVisitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  nextSequence?: number;
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

export function RouteVisitForm({
  open,
  onOpenChange,
  routeId,
  nextSequence = 1,
}: RouteVisitFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Pick<Customer, "id" | "legalName" | "commercialName">[]>([]);

  useEffect(() => {
    if (open) {
      getCustomers({ limit: 500 })
        .then((r) => setCustomers(r.items))
        .catch(() => void 0);
    }
  }, [open]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RouteVisitFormValues>({
    resolver: standardSchemaResolver(routeVisitSchema) as any,
    defaultValues: {
      sequence: nextSequence,
      visitWindow: "all_day",
    },
  });

  const onSubmit = handleSubmit(async (raw) => {
    setLoading(true);
    const data = Object.fromEntries(
      Object.entries(raw).filter(([_, v]) => v !== "" && v !== undefined)
    );
    try {
      await addRouteVisit(routeId, data);
      router.refresh();
      onOpenChange(false);
      reset();
      toast.success("Visita agregada");
    } catch (err) {
      toast.error("Error al agregar visita", {
        description:
          err instanceof Error ? err.message : "Verificá los datos.",
      });
    } finally {
      setLoading(false);
    }
  });

  const selectCls = (hasError?: boolean) =>
    cn(
      "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
      hasError && "border-destructive focus:ring-destructive"
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar visita</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label required>Cliente</Label>
            <select
              {...register("customerId")}
              className={selectCls(!!errors.customerId)}
            >
              <option value="">Seleccioná un cliente</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.commercialName || c.legalName}
                </option>
              ))}
            </select>
            <FieldError message={errors.customerId?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Secuencia</Label>
              <Input
                {...register("sequence")}
                type="number"
                min={0}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label>Horario</Label>
              <select
                {...register("visitWindow")}
                className={selectCls(!!errors.visitWindow)}
              >
                <option value="morning">Mañana</option>
                <option value="afternoon">Tarde</option>
                <option value="all_day">Todo el día</option>
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
