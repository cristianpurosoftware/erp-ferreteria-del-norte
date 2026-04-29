"use client";

import { Percent, CheckCircle2 } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getTaxesQuery,
  getTaxById,
  createTax,
  updateTax,
  deleteTax,
} from "@/lib/actions/settings";
import { ACTIVE_INACTIVE_LABELS } from "@/lib/types";
import type { Tax } from "@/lib/types";
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

const columns: ColumnDef<Tax>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    meta: { label: "Nombre" },
  },
  {
    id: "rate",
    accessorKey: "rate",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Tasa" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-right block">{Number(row.original.rate).toFixed(2)}%</span>
    ),
    meta: { label: "Tasa" },
  },
  {
    id: "isDefault",
    accessorKey: "isDefault",
    header: "Por defecto",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.isDefault ? (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-p3/10 text-p4 dark:text-p2">
          <CheckCircle2 className="size-3" />
          Sí
        </span>
      ) : (
        <span className="text-muted-foreground text-xs">No</span>
      ),
    meta: { label: "Por defecto" },
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
  { key: "name", label: "Nombre", required: true, placeholder: "Ej: IVA 21%" },
  {
    key: "rate",
    label: "Tasa (%)",
    type: "number",
    required: true,
    min: 0,
    max: 100,
    step: 0.01,
  },
  {
    key: "isDefault",
    label: "Usar por defecto",
    type: "checkbox",
    helpText: "Aplicar este impuesto por defecto en productos nuevos.",
  },
  { key: "status", label: "Estado", type: "select", required: true, options: STATUS_OPTIONS },
];

export default function ImpuestosPage() {
  return (
    <ConfigTablePage<Tax>
      title="Impuestos"
      description="Impuestos y tasas aplicables a productos y comprobantes."
      icon={Percent}
      helpText={SCREEN_HELP["configuracion/impuestos"]}
      itemNoun="impuesto"
      searchPlaceholder="Buscar impuesto..."
      permissions={{
        view: "taxes:view",
        create: "taxes:create",
        update: "taxes:update",
        delete: "taxes:delete",
      }}
      columns={columns}
      fields={fields}
      fetchList={getTaxesQuery}
      fetchById={getTaxById}
      createItem={createTax}
      updateItem={updateTax}
      deleteItem={deleteTax}
    />
  );
}
