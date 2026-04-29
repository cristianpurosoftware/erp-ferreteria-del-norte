"use client";

import { CreditCard } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getPaymentConditionsQuery,
  getPaymentConditionById,
  createPaymentCondition,
  updatePaymentCondition,
  deletePaymentCondition,
} from "@/lib/actions/settings";
import type { PaymentCondition } from "@/lib/types";
import type { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<PaymentCondition>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    meta: { label: "Nombre" },
  },
  {
    id: "days",
    accessorKey: "days",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Días" />,
    cell: ({ row }) => {
      const d = row.original.days;
      return (
        <span className="text-right block tabular-nums">
          {d === 0 ? "Contado" : `${d} días`}
        </span>
      );
    },
    meta: { label: "Días" },
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Descripción",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm max-w-[400px] truncate block">
        {row.original.description ?? "—"}
      </span>
    ),
    meta: { label: "Descripción" },
  },
];

const fields: FieldDescriptor[] = [
  { key: "name", label: "Nombre", required: true, placeholder: "Ej: 30 días, Contado" },
  {
    key: "days",
    label: "Días",
    type: "number",
    required: true,
    min: 0,
    step: 1,
    helpText: "Usar 0 para condiciones de contado.",
  },
  { key: "description", label: "Descripción", type: "textarea", rows: 3 },
];

export default function CondicionesPagoPage() {
  return (
    <ConfigTablePage<PaymentCondition>
      title="Condiciones de pago"
      description="Plazos de pago por cantidad de días."
      icon={CreditCard}
      helpText={SCREEN_HELP["configuracion/condiciones-pago"]}
      itemNoun="condición de pago"
      searchPlaceholder="Buscar condición..."
      itemNounSingular={{ article: "la", word: "condición de pago" }}
      permissions={{
        view: "payment_conditions:view",
        create: "payment_conditions:create",
        update: "payment_conditions:update",
        delete: "payment_conditions:delete",
      }}
      columns={columns}
      fields={fields}
      fetchList={getPaymentConditionsQuery}
      fetchById={getPaymentConditionById}
      createItem={createPaymentCondition}
      updateItem={updatePaymentCondition}
      deleteItem={deletePaymentCondition}
      initialSort={[{ id: "days", desc: false }]}
    />
  );
}
