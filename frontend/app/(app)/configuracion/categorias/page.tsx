"use client";

import * as React from "react";
import { Tags } from "lucide-react";
import { ConfigTablePage, type FieldDescriptor } from "@/components/config/config-table-page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  getCategoriesQuery,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
} from "@/lib/actions/settings";
import { ACTIVE_INACTIVE_LABELS } from "@/lib/types";
import type { Category } from "@/lib/types";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

type CategoryRow = Category & { parentName?: string | null };

const STATUS_COLORS: Record<string, string> = {
  active: "bg-p3/10 text-p4 dark:text-p2",
  inactive: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

const NO_PARENT_VALUE = "__none__";

export default function CategoriasPage() {
  const [categories, setCategories] = React.useState<Category[]>([]);

  const loadCategories = React.useCallback(() => {
    getCategories({ limit: 500 })
      .then((res) => setCategories(res.items))
      .catch(() => setCategories([]));
  }, []);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const parentOptions = React.useMemo(
    () => [
      { value: NO_PARENT_VALUE, label: "Sin categoría padre" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const columns = React.useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        meta: { label: "Nombre" },
      },
      {
        id: "parentName",
        accessorKey: "parentName",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Categoría padre" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{row.original.parentName ?? "—"}</span>
        ),
        meta: { label: "Categoría padre" },
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
        key: "parentId",
        label: "Categoría padre",
        type: "select",
        options: parentOptions,
        helpText: "Opcional. No puede ser la misma categoría.",
      },
      { key: "status", label: "Estado", type: "select", required: true, options: STATUS_OPTIONS },
    ],
    [parentOptions],
  );

  const normalizePayload = (data: Record<string, unknown>) => {
    if (data.parentId === NO_PARENT_VALUE || data.parentId === "") {
      return { ...data, parentId: null };
    }
    return data;
  };

  return (
    <ConfigTablePage<CategoryRow>
      title="Categorías"
      description="Clasificación jerárquica de productos."
      icon={Tags}
      helpText={SCREEN_HELP["configuracion/categorias"]}
      itemNoun="categoría"
      itemNounSingular={{ article: "la", word: "categoría" }}
      searchPlaceholder="Buscar categoría..."
      permissions={{
        view: "categories:view",
        create: "categories:create",
        update: "categories:update",
        delete: "categories:delete",
      }}
      columns={columns}
      fields={fields}
      fetchList={getCategoriesQuery}
      fetchById={getCategoryById}
      createItem={(data) => createCategory(normalizePayload(data))}
      updateItem={(id, data) => updateCategory(id, normalizePayload(data))}
      deleteItem={async (id) => {
        await deleteCategory(id);
        loadCategories();
      }}
    />
  );
}
