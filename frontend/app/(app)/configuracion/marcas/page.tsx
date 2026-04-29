"use client";

import { Palette } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getBrandsQuery,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} from "@/lib/actions/settings";
import { ACTIVE_INACTIVE_LABELS } from "@/lib/types";
import type { Brand } from "@/lib/types";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-p3/10 text-p4 dark:text-p2",
  inactive: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
};

const STATUS_OPTIONS = Object.entries(ACTIVE_INACTIVE_LABELS)
  .filter(([k]) => k === "active" || k === "inactive")
  .map(([value, label]) => ({ value, label }));

const columns: ColumnDef<Brand>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    meta: { label: "Nombre" },
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
  { key: "name", label: "Nombre", required: true },
  { key: "status", label: "Estado", type: "select", required: true, options: STATUS_OPTIONS },
];

export default function MarcasPage() {
  return (
    <ConfigTablePage<Brand>
      title="Marcas"
      description="Marcas asociadas a los productos del catálogo."
      icon={Palette}
      helpText={SCREEN_HELP["configuracion/marcas"]}
      itemNoun="marca"
      searchPlaceholder="Buscar marca..."
      itemNounSingular={{ article: "la", word: "marca" }}
      permissions={{
        view: "brands:view",
        create: "brands:create",
        update: "brands:update",
        delete: "brands:delete",
      }}
      columns={columns}
      fields={fields}
      fetchList={getBrandsQuery}
      fetchById={getBrandById}
      createItem={createBrand}
      updateItem={updateBrand}
      deleteItem={deleteBrand}
    />
  );
}
