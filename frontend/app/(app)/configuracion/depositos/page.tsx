"use client";

import * as React from "react";
import { Warehouse } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getWarehousesQuery,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getBranches,
} from "@/lib/actions/settings";
import { ACTIVE_INACTIVE_LABELS } from "@/lib/types";
import type { Warehouse as WarehouseType, Branch } from "@/lib/types";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

type WarehouseRow = WarehouseType & { branchName?: string | null };

const STATUS_COLORS: Record<string, string> = {
  active: "bg-p3/10 text-p4 dark:text-p2",
  inactive: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

const TYPE_OPTIONS = [
  { value: "physical", label: "Físico" },
  { value: "virtual", label: "Virtual" },
];

const TYPE_COLORS: Record<string, string> = {
  physical: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  virtual: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const TYPE_LABELS: Record<string, string> = { physical: "Físico", virtual: "Virtual" };

export default function DepositosPage() {
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

  const columns = React.useMemo<ColumnDef<WarehouseRow>[]>(
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
        id: "type",
        accessorKey: "type",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Tipo" />,
        cell: ({ row }) => (
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              TYPE_COLORS[row.original.type] ?? "bg-gray-500/10 text-gray-600 dark:text-gray-400",
            )}
          >
            {TYPE_LABELS[row.original.type] ?? row.original.type}
          </span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: TYPE_OPTIONS },
        enableColumnFilter: true,
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
    ],
    [],
  );

  const fields = React.useMemo<FieldDescriptor[]>(
    () => [
      { key: "name", label: "Nombre", required: true },
      {
        key: "branchId",
        label: "Sucursal",
        type: "select",
        required: true,
        options: branchOptions,
      },
      { key: "type", label: "Tipo", type: "select", required: true, options: TYPE_OPTIONS },
      { key: "status", label: "Estado", type: "select", required: true, options: STATUS_OPTIONS },
    ],
    [branchOptions],
  );

  return (
    <ConfigTablePage<WarehouseRow>
      title="Depósitos"
      description="Depósitos físicos o virtuales donde se almacena stock."
      icon={Warehouse}
      helpText={SCREEN_HELP["configuracion/depositos"]}
      itemNoun="depósito"
      searchPlaceholder="Buscar depósito..."
      permissions={{
        view: "warehouses:view",
        create: "warehouses:create",
        update: "warehouses:update",
        delete: "warehouses:delete",
      }}
      columns={columns}
      fields={fields}
      fetchList={getWarehousesQuery}
      fetchById={getWarehouseById}
      createItem={createWarehouse}
      updateItem={updateWarehouse}
      deleteItem={deleteWarehouse}
    />
  );
}
