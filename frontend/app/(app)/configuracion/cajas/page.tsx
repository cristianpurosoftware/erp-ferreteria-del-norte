"use client";

import * as React from "react";
import { Vault } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getCashboxListQuery,
  getCashboxById,
  createCashbox,
  updateCashbox,
  deleteCashbox,
  getBranches,
} from "@/lib/actions/settings";
import type { Cashbox, Branch } from "@/lib/types";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

type CashboxRow = Cashbox & { branchName?: string | null };

const STATUS_COLORS: Record<string, string> = {
  open: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  closed: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = { open: "Abierta", closed: "Cerrada" };

const STATUS_OPTIONS = [
  { value: "open", label: "Abierta" },
  { value: "closed", label: "Cerrada" },
];

export default function CajasPage() {
  const [branches, setBranches] = React.useState<Branch[]>([]);

  React.useEffect(() => {
    getBranches({ limit: 500 })
      .then((res) => setBranches(res.items))
      .catch(() => setBranches([]));
  }, []);

  const branchOptions = React.useMemo(
    () => branches.map((b) => ({ value: b.id, label: b.name })),
    [branches],
  );

  const columns = React.useMemo<ColumnDef<CashboxRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        meta: { label: "Nombre" },
      },
      {
        id: "branchName",
        accessorKey: "branchName",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Sucursal" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{row.original.branchName ?? "—"}</span>
        ),
        meta: { label: "Sucursal" },
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
            {STATUS_LABELS[row.original.status] ?? row.original.status}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS },
        enableColumnFilter: true,
      },
    ],
    [],
  );

  const fields = React.useMemo<FieldDescriptor[]>(
    () => [
      { key: "name", label: "Nombre", required: true, placeholder: "Ej: Caja Principal" },
      {
        key: "branchId",
        label: "Sucursal",
        type: "select",
        required: true,
        options: branchOptions,
      },
    ],
    [branchOptions],
  );

  return (
    <ConfigTablePage<CashboxRow>
      title="Cajas"
      description="Cajas por sucursal para registrar cobros y pagos."
      icon={Vault}
      helpText={SCREEN_HELP["configuracion/cajas"]}
      itemNoun="caja"
      searchPlaceholder="Buscar caja..."
      itemNounSingular={{ article: "la", word: "caja" }}
      permissions={{
        view: "cashbox:view",
        create: "cashbox:manage",
        update: "cashbox:manage",
        delete: "cashbox:manage",
      }}
      columns={columns}
      fields={fields}
      fetchList={getCashboxListQuery}
      fetchById={getCashboxById}
      createItem={createCashbox}
      updateItem={updateCashbox}
      deleteItem={deleteCashbox}
    />
  );
}
