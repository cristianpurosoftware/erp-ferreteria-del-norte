"use client";

import { MapPin } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getBranchesQuery,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from "@/lib/actions/settings";
import { ACTIVE_INACTIVE_LABELS } from "@/lib/types";
import type { Branch } from "@/lib/types";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-p3/10 text-p4 dark:text-p2",
  inactive: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

const columns: ColumnDef<Branch>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    meta: { label: "Nombre" },
  },
  {
    id: "code",
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Código" />,
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    meta: { label: "Código" },
  },
  {
    id: "address",
    accessorKey: "address",
    header: "Dirección",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm max-w-[300px] truncate block">
        {row.original.address ?? "—"}
      </span>
    ),
    meta: { label: "Dirección" },
  },
  {
    id: "phone",
    accessorKey: "phone",
    header: "Teléfono",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.phone ?? "—"}</span>
    ),
    meta: { label: "Teléfono" },
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Estado" />,
    cell: ({ row }) => (
      <span
        className={cn(
          "text-xs px-2 py-0.5 rounded-full font-medium",
          STATUS_COLORS[row.original.status] ?? "bg-gray-500/10 text-gray-600 dark:text-gray-400",
        )}
      >
        {ACTIVE_INACTIVE_LABELS[row.original.status] ?? row.original.status}
      </span>
    ),
    meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS },
    enableColumnFilter: true,
  },
];

const fields: FieldDescriptor[] = [
  { key: "name", label: "Nombre", required: true, placeholder: "Ej: Sucursal Centro" },
  { key: "code", label: "Código", required: true, placeholder: "Ej: SUC01" },
  { key: "address", label: "Dirección" },
  { key: "phone", label: "Teléfono" },
  { key: "status", label: "Estado", type: "select", required: true, options: STATUS_OPTIONS },
];

export default function SucursalesPage() {
  return (
    <ConfigTablePage<Branch>
      title="Sucursales"
      description="Puntos de operación de la empresa."
      icon={MapPin}
      helpText={SCREEN_HELP["configuracion/sucursales"]}
      itemNoun="sucursal"
      searchPlaceholder="Buscar sucursal..."
      itemNounSingular={{ article: "la", word: "sucursal" }}
      permissions={{
        view: "branches:view",
        create: "branches:create",
        update: "branches:update",
        delete: "branches:delete",
      }}
      columns={columns}
      fields={fields}
      fetchList={getBranchesQuery}
      fetchById={getBranchById}
      createItem={createBranch}
      updateItem={updateBranch}
      deleteItem={deleteBranch}
    />
  );
}
