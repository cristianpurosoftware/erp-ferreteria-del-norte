"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDrawer } from "@/components/forms/form-drawer";
import { createSupplier, updateSupplier } from "@/lib/actions/purchases";
import type { Supplier } from "@/lib/types";

interface SupplierFormValues {
  name: string;
  taxId: string;
  primaryContact: string;
  phone: string;
  email: string;
  paymentCondition: string;
}

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
}

function getDefaultValues(supplier?: Supplier): SupplierFormValues {
  if (!supplier) {
    return { name: "", taxId: "", primaryContact: "", phone: "", email: "", paymentCondition: "" };
  }
  return {
    name: supplier.name,
    taxId: supplier.taxId ?? "",
    primaryContact: supplier.primaryContact ?? "",
    phone: supplier.phone ?? "",
    email: supplier.email ?? "",
    paymentCondition: supplier.paymentCondition ?? "",
  };
}

export function SupplierForm({ open, onOpenChange, supplier }: SupplierFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = !!supplier;

  const { register, handleSubmit, reset } = useForm<SupplierFormValues>({
    defaultValues: getDefaultValues(supplier),
  });

  useEffect(() => {
    if (open) reset(getDefaultValues(supplier));
  }, [open, supplier?.id, reset]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    try {
      if (isEdit) {
        await updateSupplier(supplier.id, {
          name: data.name,
          taxId: data.taxId || undefined,
          primaryContact: data.primaryContact || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          paymentCondition: data.paymentCondition || undefined,
        });
      } else {
        await createSupplier({
          name: data.name,
          taxId: data.taxId || undefined,
          primaryContact: data.primaryContact || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          paymentCondition: data.paymentCondition || undefined,
        });
      }
      router.refresh();
      reset(getDefaultValues());
      onOpenChange(false);
      toast.success(isEdit ? "Proveedor actualizado" : "Proveedor creado", { description: data.name });
    } catch (err) {
      toast.error("Error al guardar proveedor", { description: err instanceof Error ? err.message : "Verificá los datos e intentá de nuevo." });
    } finally {
      setLoading(false);
    }
  });

  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
      title={isEdit ? "Editar proveedor" : "Nuevo proveedor"}
      onSubmit={onSubmit}
      loading={loading}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nombre *</Label>
          <Input {...register("name", { required: true })} placeholder="Razon social o nombre" />
        </div>
        <div className="space-y-2">
          <Label>CUIT / ID Fiscal</Label>
          <Input {...register("taxId")} placeholder="30-12345678-9" />
        </div>
        <div className="space-y-2">
          <Label>Contacto principal</Label>
          <Input {...register("primaryContact")} placeholder="Nombre del contacto" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Telefono</Label>
            <Input {...register("phone")} placeholder="+54 11 ..." />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input {...register("email")} type="email" placeholder="email@..." />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Condicion de pago</Label>
          <Input {...register("paymentCondition")} placeholder="30 dias, contado, etc." />
        </div>
      </div>
    </FormDrawer>
  );
}
