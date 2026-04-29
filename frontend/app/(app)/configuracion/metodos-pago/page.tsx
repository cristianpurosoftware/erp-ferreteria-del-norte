"use client";

import { CreditCard } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getPaymentMethodsQuery,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/lib/actions/settings";
import { ACTIVE_INACTIVE_LABELS } from "@/lib/types";
import type { PaymentMethod } from "@/lib/types";
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

const columns: ColumnDef<PaymentMethod>[] = [
  {
    id: "code",
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Código" />,
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    meta: { label: "Código" },
  },
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    meta: { label: "Nombre" },
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Descripción",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm max-w-[300px] truncate block">
        {row.original.description ?? "—"}
      </span>
    ),
    meta: { label: "Descripción" },
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
  { key: "code", label: "Código", required: true, placeholder: "Ej: EF, TR, TC" },
  { key: "name", label: "Nombre", required: true },
  { key: "description", label: "Descripción", type: "textarea", rows: 3 },
  { key: "status", label: "Estado", type: "select", required: true, options: STATUS_OPTIONS },
];

export default function MetodosPagoPage() {
  return (
    <ConfigTablePage<PaymentMethod>
      title="Métodos de pago"
      description="Medios de pago aceptados por la empresa."
      icon={CreditCard}
      helpText={SCREEN_HELP["configuracion/metodos-pago"]}
      itemNoun="método de pago"
      searchPlaceholder="Buscar método de pago..."
      permissions={{
        view: "payment_methods:view",
        create: "payment_methods:create",
        update: "payment_methods:update",
        delete: "payment_methods:delete",
      }}
      columns={columns}
      fields={fields}
      fetchList={getPaymentMethodsQuery}
      fetchById={getPaymentMethodById}
      createItem={createPaymentMethod}
      updateItem={updatePaymentMethod}
      deleteItem={deletePaymentMethod}
      initialSort={[{ id: "code", desc: false }]}
    />
  );
}
