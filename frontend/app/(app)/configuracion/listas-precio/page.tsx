"use client";

import { DollarSign, CheckCircle2 } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getPriceListsQuery,
  getPriceListById,
  createPriceList,
  updatePriceList,
  deletePriceList,
} from "@/lib/actions/settings";
import { ACTIVE_INACTIVE_LABELS } from "@/lib/types";
import type { PriceList } from "@/lib/types";
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

const CURRENCY_OPTIONS = [
  { value: "ARS", label: "ARS — Peso argentino" },
  { value: "USD", label: "USD — Dólar estadounidense" },
  { value: "EUR", label: "EUR — Euro" },
];

function formatDate(d: string | null): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function renderVigencia(from: string | null, until: string | null): string {
  const f = formatDate(from);
  const u = formatDate(until);
  if (!f && !u) return "Sin vigencia";
  if (f && u) return `${f} — ${u}`;
  if (f) return `Desde ${f}`;
  return `Hasta ${u}`;
}

const columns: ColumnDef<PriceList>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    meta: { label: "Nombre" },
  },
  {
    id: "currency",
    accessorKey: "currency",
    header: "Moneda",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-mono text-xs uppercase text-muted-foreground">
        {row.original.currency}
      </span>
    ),
    meta: { label: "Moneda" },
  },
  {
    id: "validFrom",
    accessorKey: "validFrom",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Vigencia" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {renderVigencia(row.original.validFrom, row.original.validUntil)}
      </span>
    ),
    meta: { label: "Vigencia" },
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
  { key: "name", label: "Nombre", required: true, placeholder: "Ej: Lista mayorista" },
  {
    key: "currency",
    label: "Moneda",
    type: "select",
    required: true,
    options: CURRENCY_OPTIONS,
    placeholder: "Seleccionar moneda…",
  },
  { key: "validFrom", label: "Vigencia desde", type: "date" },
  { key: "validUntil", label: "Vigencia hasta", type: "date" },
  {
    key: "isDefault",
    label: "Usar por defecto",
    type: "checkbox",
    helpText: "Aplicar esta lista por defecto a nuevos clientes.",
  },
  { key: "status", label: "Estado", type: "select", required: true, options: STATUS_OPTIONS },
];

export default function ListasPrecioPage() {
  return (
    <ConfigTablePage<PriceList>
      title="Listas de precio"
      description="Listas de precios con vigencia y moneda."
      icon={DollarSign}
      helpText={SCREEN_HELP["configuracion/listas-precio"]}
      itemNoun="lista de precio"
      searchPlaceholder="Buscar lista de precios..."
      itemNounSingular={{ article: "la", word: "lista de precio" }}
      permissions={{
        view: "price_lists:view",
        create: "price_lists:create",
        update: "price_lists:update",
        delete: "price_lists:delete",
      }}
      columns={columns}
      fields={fields}
      fetchList={getPriceListsQuery}
      fetchById={getPriceListById}
      createItem={createPriceList}
      updateItem={updatePriceList}
      deleteItem={deletePriceList}
    />
  );
}
