"use client";

import { Ruler } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getUnitsQuery,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
} from "@/lib/actions/settings";
import type { Unit } from "@/lib/types";
import type { ColumnDef } from "@tanstack/react-table";

const TYPE_LABELS: Record<string, string> = {
  count: "Unidad / conteo",
  weight: "Peso",
  volume: "Volumen",
  length: "Longitud",
};

const TYPE_OPTIONS = [
  { value: "count", label: "Unidad / conteo" },
  { value: "weight", label: "Peso" },
  { value: "volume", label: "Volumen" },
  { value: "length", label: "Longitud" },
];

const columns: ColumnDef<Unit>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    meta: { label: "Nombre" },
  },
  {
    id: "abbreviation",
    accessorKey: "abbreviation",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Abreviatura" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.abbreviation}</span>,
    meta: { label: "Abreviatura" },
  },
  {
    id: "type",
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Tipo" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{TYPE_LABELS[row.original.type] ?? row.original.type}</span>
    ),
    meta: { label: "Tipo", variant: "multiSelect", options: TYPE_OPTIONS },
    enableColumnFilter: true,
  },
];

const fields: FieldDescriptor[] = [
  { key: "name", label: "Nombre", required: true, placeholder: "Ej: Unidad, Kilogramo" },
  { key: "abbreviation", label: "Abreviatura", required: true, placeholder: "u, kg, ml" },
  { key: "type", label: "Tipo", type: "select", required: true, options: TYPE_OPTIONS },
];

export default function UnidadesPage() {
  return (
    <ConfigTablePage<Unit>
      title="Unidades"
      description="Unidades de medida utilizadas en productos."
      icon={Ruler}
      helpText={SCREEN_HELP["configuracion/unidades"]}
      itemNoun="unidad"
      searchPlaceholder="Buscar unidad..."
      itemNounSingular={{ article: "la", word: "unidad" }}
      permissions={{
        view: "units:view",
        create: "units:create",
        update: "units:update",
        delete: "units:delete",
      }}
      columns={columns}
      fields={fields}
      fetchList={getUnitsQuery}
      fetchById={getUnitById}
      createItem={createUnit}
      updateItem={updateUnit}
      deleteItem={deleteUnit}
    />
  );
}
