"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { getRoles, getTeam, deleteRole } from "@/lib/actions/team";
import type { Role, User } from "@/lib/types";
import { RoleForm } from "@/components/forms/role-form";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

export default function RolesPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);

  const [roleFormOpen, setRoleFormOpen] = React.useState(false);
  const [editRole, setEditRole] = React.useState<Role | undefined>();
  const [roleToDelete, setRoleToDelete] = React.useState<Role | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const refetchAll = React.useCallback(async () => {
    const [r, u] = await Promise.all([getRoles(), getTeam({ limit: 500 })]);
    setRoles(r.items);
    setUsers(u.items);
  }, []);

  React.useEffect(() => {
    refetchAll().finally(() => setLoading(false));
  }, [refetchAll]);

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    setDeleting(true);
    try {
      await deleteRole(roleToDelete.id);
      toast.success("Rol eliminado", { description: roleToDelete.name });
      setRoleToDelete(null);
      await refetchAll();
    } catch (err) {
      toast.error("No se pudo eliminar", { description: err instanceof Error ? err.message : "" });
    } finally {
      setDeleting(false);
    }
  };

  const columns = React.useMemo<ColumnDef<Role>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Rol" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{row.original.name}</span>
            {row.original.isSystemRole && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                Sistema
              </span>
            )}
          </div>
        ),
        meta: { label: "Rol", placeholder: "Buscar rol...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Descripción",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.description ?? "—"}</span>
        ),
        meta: { label: "Descripción" },
      },
      {
        id: "users",
        accessorFn: (row) => users.filter((u) => u.roleId === row.id).length,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Usuarios" />,
        cell: ({ row }) => {
          const count = users.filter((u) => u.roleId === row.original.id).length;
          return <span className="text-right text-sm tabular-nums block">{count}</span>;
        },
        meta: { label: "Usuarios" },
      },
      {
        id: "permissions",
        accessorFn: (row) => row.rolePermissions?.length ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Permisos" />,
        cell: ({ row }) => (
          <span className="text-right text-sm tabular-nums block">{row.original.rolePermissions?.length ?? 0}</span>
        ),
        meta: { label: "Permisos" },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const r = row.original;
          const userCount = users.filter((u) => u.roleId === r.id).length;
          const canEdit = can("roles:update");
          const canDelete = can("roles:delete") && !r.isSystemRole && userCount === 0;
          if (!canEdit && !canDelete) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {canEdit && (
                    <DropdownMenuItem onSelect={() => { setEditRole(r); setRoleFormOpen(true); }}>
                      <Pencil /> Editar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      {canEdit && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={() => setRoleToDelete(r)}>
                        <Trash2 /> Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [can, users],
  );

  const { table } = useDataTable({
    data: roles,
    columns,
    pageCount: -1,
    getRowId: (row) => row.id,
    manualMode: false,
    initialState: {
      sorting: [{ id: "name", desc: false }],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  return (
    <>
      <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Shield className="size-6 text-p3" />
                Roles
                <PageHelpTooltip content={SCREEN_HELP["equipo/roles"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {roles.length} roles
              </p>
            </div>
            {can("roles:create") && (
              <Button size="sm" className="gap-1.5" onClick={() => { setEditRole(undefined); setRoleFormOpen(true); }}>
                <Plus className="size-4" />
                Nuevo rol
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={5} />
        </div>
      </div>

      <RoleForm
        open={roleFormOpen}
        onOpenChange={(open) => {
          setRoleFormOpen(open);
          if (!open) { setEditRole(undefined); refetchAll(); }
        }}
        role={editRole}
      />

      <AlertDialog open={!!roleToDelete} onOpenChange={(o) => !o && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rol</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que querés eliminar el rol <strong>{roleToDelete?.name}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
