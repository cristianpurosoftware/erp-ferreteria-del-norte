"use client";

import * as React from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { getCompany, updateCompany } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";
import type { Company } from "@/lib/types";

type CompanyForm = {
  razon_social: string;
  nombre_comercial: string;
  phone: string;
  email: string;
  address: string;
};

const EMPTY: CompanyForm = {
  razon_social: "",
  nombre_comercial: "",
  phone: "",
  email: "",
  address: "",
};

export default function EmpresaPage() {
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState<CompanyForm>(EMPTY);

  React.useEffect(() => {
    getCompany()
      .then((c: Company) =>
        setForm({
          razon_social: c.razon_social ?? "",
          nombre_comercial: c.nombre_comercial ?? "",
          phone: c.phone ?? "",
          email: c.email ?? "",
          address: c.address ?? "",
        }),
      )
      .catch(() => toast.error("No se pudieron cargar los datos de la empresa."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]),
      );
      await updateCompany(payload);
      toast.success("Cambios guardados.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Building2 className="size-6 text-p3" />
            Empresa
            <PageHelpTooltip content={SCREEN_HELP["configuracion/empresa"]} />
          </h1>
          <p className="text-sm text-muted-foreground">
            Datos fiscales y de contacto de la empresa.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-2xl">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razon_social">Razón social</Label>
                  <Input
                    id="razon_social"
                    value={form.razon_social}
                    onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre_comercial">Nombre comercial</Label>
                  <Input
                    id="nombre_comercial"
                    value={form.nombre_comercial}
                    onChange={(e) => setForm((f) => ({ ...f, nombre_comercial: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <Button onClick={handleSave} disabled={submitting}>
                {submitting ? "Guardando…" : "Guardar cambios"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
