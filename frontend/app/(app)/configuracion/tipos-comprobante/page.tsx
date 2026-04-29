"use client";

import { FileText } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getInvoiceTypesQuery,
  getInvoiceTypeById,
  createInvoiceType,
  updateInvoiceType,
  deleteInvoiceType,
} from "@/lib/actions/settings";
import type { InvoiceType } from "@/lib/types";
import type { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<InvoiceType>[] = [
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
      <span className="text-muted-foreground text-sm max-w-[400px] truncate block">
        {row.original.description ?? "—"}
      </span>
    ),
    meta: { label: "Descripción" },
  },
];

const fields: FieldDescriptor[] = [
  { key: "code", label: "Código", required: true, placeholder: "Ej: FA, NC, ND" },
  { key: "name", label: "Nombre", required: true },
  { key: "description", label: "Descripción", type: "textarea", rows: 3 },
];

export default function TiposComprobantePage() {
  return (
    <ConfigTablePage<InvoiceType>
      title="Tipos de comprobante"
      description="Tipos de comprobante reconocidos por el sistema."
      icon={FileText}
      helpText={SCREEN_HELP["configuracion/tipos-comprobante"]}
      itemNoun="tipo de comprobante"
      searchPlaceholder="Buscar tipo..."
      permissions={{
        view: "invoice_types:view",
        create: "invoice_types:create",
        update: "invoice_types:update",
        delete: "invoice_types:delete",
      }}
      columns={columns}
      fields={fields}
      fetchList={getInvoiceTypesQuery}
      fetchById={getInvoiceTypeById}
      createItem={createInvoiceType}
      updateItem={updateInvoiceType}
      deleteItem={deleteInvoiceType}
      initialSort={[{ id: "code", desc: false }]}
    />
  );
}
