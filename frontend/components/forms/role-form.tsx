"use client";

import * as React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDrawer } from "@/components/forms/form-drawer";
import { createRole, updateRole, getPermissions } from "@/lib/actions/team";
import type { Role, Permission } from "@/lib/types";
import {
  getPermissionLabel,
  getPermissionSectionLabel,
  sortPermissions,
} from "@/lib/permission-labels";

interface RoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
}

export function RoleForm({ open, onOpenChange, role }: RoleFormProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [permissions, setPermissions] = React.useState<Permission[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const isEdit = Boolean(role);

  React.useEffect(() => {
    if (!open) return;
    getPermissions().then((r) => setPermissions(r)).catch(() => setPermissions([]));
    if (role) {
      setName(role.name);
      setDescription(role.description ?? "");
      setSelected(new Set(role.rolePermissions?.map((rp) => rp.permissionId) ?? []));
    } else {
      setName("");
      setDescription("");
      setSelected(new Set());
    }
    setSearch("");
  }, [open, role]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const grouped = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    // Match against: technical name, Spanish label, and Spanish section label —
    // user can search "pedidos", "crear pedidos" or "orders:create".
    const filtered = q
      ? permissions.filter((p) => {
          const section = p.section ?? p.name.split(":")[0] ?? "otros";
          return (
            p.name.toLowerCase().includes(q) ||
            getPermissionLabel(p.name).toLowerCase().includes(q) ||
            getPermissionSectionLabel(section).toLowerCase().includes(q)
          );
        })
      : permissions;

    const bySection: Record<string, Permission[]> = {};
    filtered.forEach((p) => {
      const section = p.section ?? p.name.split(":")[0] ?? "otros";
      (bySection[section] ??= []).push(p);
    });
    // CRUD-first sort within each section.
    for (const k of Object.keys(bySection)) bySection[k] = sortPermissions(bySection[k]);
    return bySection;
  }, [permissions, search]);

  // Section order is driven by the Spanish label, not the raw key.
  const sectionsSorted = React.useMemo(
    () =>
      Object.keys(grouped).sort((a, b) =>
        getPermissionSectionLabel(a).localeCompare(getPermissionSectionLabel(b)),
      ),
    [grouped],
  );

  const submit = async () => {
    if (!name.trim() || selected.size === 0) {
      toast.error("Completá nombre y al menos un permiso");
      return;
    }
    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        permissionIds: Array.from(selected),
      };
      if (isEdit && role) {
        await updateRole(role.id, data);
        toast.success("Rol actualizado", { description: name });
      } else {
        await createRole(data);
        toast.success("Rol creado", { description: name });
      }
      onOpenChange(false);
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Editar rol · ${role?.name}` : "Nuevo rol"}
      onSubmit={submit}
      loading={loading}
      submitLabel={isEdit ? "Guardar" : "Crear"}
    >
      <div className="space-y-4 p-4">
        <div>
          <Label htmlFor="role-name" className="text-sm">Nombre *</Label>
          <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 mt-1" placeholder="Operaciones" disabled={role?.isSystemRole} />
          {role?.isSystemRole && <p className="text-xs text-muted-foreground mt-1">Los roles de sistema no pueden renombrarse.</p>}
        </div>
        <div>
          <Label htmlFor="role-desc" className="text-sm">Descripción</Label>
          <Input id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 mt-1" placeholder="Acceso a pedidos, stock y picking" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">Permisos * <span className="text-muted-foreground font-normal">({selected.size} seleccionados)</span></Label>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm mb-2"
            placeholder="Buscar por nombre, sección o código técnico..."
          />
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 rounded-md border border-border p-3 bg-muted/20">
            {sectionsSorted.map((section) => (
              <div key={section}>
                <p className="text-xs font-semibold text-foreground mb-1.5">
                  {getPermissionSectionLabel(section)}
                </p>
                <div className="space-y-1.5">
                  {grouped[section].map((p) => (
                    <label key={p.id} className="flex items-start gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} className="mt-0.5" />
                      <span className="flex-1 min-w-0">
                        <span className="block leading-tight">{getPermissionLabel(p.name)}</span>
                        <span className="block font-mono text-[10px] text-muted-foreground leading-tight">
                          {p.name}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {sectionsSorted.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin resultados.</p>
            )}
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}
