"use client";

import * as React from "react";
import { Landmark } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getJurisdictionsQuery,
  getJurisdictionById,
  createJurisdiction,
  updateJurisdiction,
  deleteJurisdiction,
  getJurisdictions,
} from "@/lib/actions/jurisdictions";
import type { Jurisdiction } from "@/lib/types";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

const KIND_LABELS: Record<string, string> = {
  national: "Nacional",
  provincial: "Provincial",
  municipal: "Municipal",
};

const KIND_COLORS: Record<string, string> = {
  national: "bg-p3/10 text-p4 dark:text-p2",
  provincial: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  municipal: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const KIND_OPTIONS = [
  { value: "national", label: "Nacional" },
  { value: "provincial", label: "Provincial" },
  { value: "municipal", label: "Municipal" },
];

const NO_PARENT_VALUE = "__none__";

export default function JurisdiccionesPage() {
  const [jurisdictions, setJurisdictions] = React.useState<Jurisdiction[]>([]);

  React.useEffect(() => {
    getJurisdictions({ limit: 500 })
      .then((res) => setJurisdictions(res.items))
      .catch(() => setJurisdictions([]));
  }, []);

  const parentOptions = React.useMemo(
    () => [
      { value: NO_PARENT_VALUE, label: "Sin jurisdicción padre" },
      ...jurisdictions.map((j) => ({ value: j.id, label: `${j.code} — ${j.name}` })),
    ],
    [jurisdictions],
  );

  const columns = React.useMemo<ColumnDef<Jurisdiction>[]>(
    () => [
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
        id: "kind",
        accessorKey: "kind",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Tipo" />,
        cell: ({ row }) => (
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              KIND_COLORS[row.original.kind] ?? "bg-gray-500/10 text-gray-600 dark:text-gray-400",
            )}
          >
            {KIND_LABELS[row.original.kind] ?? row.original.kind}
          </span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: KIND_OPTIONS },
        enableColumnFilter: true,
      },
    ],
    [],
  );

  const fields = React.useMemo<FieldDescriptor[]>(
    () => [
      {
        key: "code",
        label: "Código",
        required: true,
        placeholder: "Ej: AR, AR-B, AR-B-MARDEL",
        helpText: "El código no se puede modificar después de crear la jurisdicción.",
        createOnly: true,
      },
      { key: "name", label: "Nombre", required: true },
      { key: "kind", label: "Tipo", type: "select", options: KIND_OPTIONS },
      {
        key: "parentJurisdictionId",
        label: "Jurisdicción padre",
        type: "select",
        options: parentOptions,
        helpText: "Opcional. Usada para modelar jerarquías (provincia > municipio).",
      },
    ],
    [parentOptions],
  );

  const normalizePayload = (data: Record<string, unknown>) => {
    if (data.parentJurisdictionId === NO_PARENT_VALUE || data.parentJurisdictionId === "") {
      return { ...data, parentJurisdictionId: null };
    }
    return data;
  };

  return (
    <ConfigTablePage<Jurisdiction>
      title="Jurisdicciones"
      description="Nación, provincias y municipios para retenciones y padrones fiscales."
      icon={Landmark}
      helpText={SCREEN_HELP["configuracion/jurisdicciones"]}
      itemNoun="jurisdicción"
      searchPlaceholder="Buscar jurisdicción..."
      itemNounSingular={{ article: "la", word: "jurisdicción" }}
      permissions={{
        view: "jurisdictions:view",
        create: "jurisdictions:create",
        update: "jurisdictions:update",
        delete: "jurisdictions:delete",
      }}
      columns={columns}
      fields={fields}
      fetchList={getJurisdictionsQuery}
      fetchById={getJurisdictionById}
      createItem={(data) => createJurisdiction(normalizePayload(data))}
      updateItem={(id, data) => updateJurisdiction(id, normalizePayload(data))}
      deleteItem={deleteJurisdiction}
      initialSort={[{ id: "code", desc: false }]}
    />
  );
}
