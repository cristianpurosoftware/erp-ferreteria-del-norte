"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Warehouse as WarehouseIcon, Tag } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { getStock } from "@/lib/actions/inventory";
import { cn } from "@/lib/utils";
import type { Stock } from "@/lib/types";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { multiSelectFilterFn } from "@/lib/data-table-filters";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STOCK_LEVEL_OPTIONS = [
  { label: "Normal", value: "ok" },
  { label: "Stock bajo", value: "low" },
  { label: "Sin stock", value: "out" },
];

function formatQty(n: number): string {
  const v = Number(n);
  return v % 1 === 0 ? v.toFixed(0) : v.toFixed(2);
}

type StockRow = Stock & { levelKind: "ok" | "low" | "out" };

export default function NivelesPage() {
  const [loading, setLoading] = React.useState(true);
  const [stockItems, setStockItems] = React.useState<Stock[]>([]);

  React.useEffect(() => {
    getStock({ limit: 500 })
      .then((s) => setStockItems(s.items))
      .finally(() => setLoading(false));
  }, []);

  const stockRows = React.useMemo<StockRow[]>(
    () =>
      stockItems.map((s) => {
        const avail = Number(s.availableQty);
        const min = Number(s.minStock);
        const levelKind = avail === 0 ? "out" : avail <= min ? "low" : "ok";
        return { ...s, levelKind };
      }),
    [stockItems],
  );

  const columns = React.useMemo<ColumnDef<StockRow>[]>(
    () => [
      {
        id: "productName",
        accessorFn: (row) =>
          `${row.productName ?? row.productSku ?? row.productId} ${row.warehouseName ?? row.warehouseId}`,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Producto" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {row.original.productName ?? row.original.productSku ?? "Producto eliminado"}
          </span>
        ),
        meta: { label: "Producto / Depósito", placeholder: "Buscar producto o depósito...", variant: "text" },
        enableColumnFilter: true,
        filterFn: (row, _id, value) => {
          const q = String(value).toLowerCase();
          if (!q) return true;
          const r = row.original;
          const hay = [r.productName, r.productSku, r.warehouseName].filter(Boolean).join(" ").toLowerCase();
          return hay.includes(q);
        },
      },
      {
        id: "warehouseName",
        accessorFn: (row) => row.warehouseName ?? row.warehouseId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Depósito" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.warehouseName ?? "Depósito eliminado"}
          </span>
        ),
        meta: { label: "Depósito" },
        enableColumnFilter: false,
      },
      {
        id: "availableQty",
        accessorKey: "availableQty",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Disponible" />,
        cell: ({ row }) => <span className="text-right tabular-nums text-sm block">{formatQty(row.original.availableQty)}</span>,
        meta: { label: "Disponible" },
        sortingFn: (a, b) => Number(a.original.availableQty) - Number(b.original.availableQty),
      },
      {
        id: "reservedQty",
        accessorKey: "reservedQty",
        header: "Reservado",
        cell: ({ row }) => <span className="text-right tabular-nums text-sm text-muted-foreground block">{formatQty(row.original.reservedQty)}</span>,
        meta: { label: "Reservado" },
      },
      {
        id: "inTransitQty",
        accessorKey: "inTransitQty",
        header: "En tránsito",
        cell: ({ row }) => <span className="text-right tabular-nums text-sm text-muted-foreground block">{formatQty(row.original.inTransitQty)}</span>,
        meta: { label: "En tránsito" },
      },
      {
        id: "minStock",
        accessorKey: "minStock",
        header: "Mínimo",
        cell: ({ row }) => <span className="text-right tabular-nums text-sm text-muted-foreground block">{formatQty(row.original.minStock)}</span>,
        meta: { label: "Mínimo" },
      },
      {
        id: "levelKind",
        accessorKey: "levelKind",
        header: "Nivel",
        cell: ({ row }) => {
          const kind = row.original.levelKind;
          const color = kind === "out" ? "bg-red-500/10 text-red-600" : kind === "low" ? "bg-yellow-500/10 text-yellow-600" : "bg-p3/10 text-p3";
          const label = kind === "out" ? "Sin stock" : kind === "low" ? "Bajo" : "Normal";
          return <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", color)}>{label}</span>;
        },
        meta: { label: "Nivel", variant: "multiSelect", options: STOCK_LEVEL_OPTIONS, icon: Tag },
        enableColumnFilter: true,
        filterFn: multiSelectFilterFn,
      },
    ],
    [],
  );

  const { table } = useDataTable({
    data: stockRows,
    columns,
    pageCount: -1,
    getRowId: (row) => row.id,
    manualMode: false,
    initialState: {
      sorting: [{ id: "productName", desc: false }, { id: "warehouseName", desc: false }],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const exportRows = buildExportRows(table, (s) => [
    s.productName ?? s.productSku ?? "",
    s.warehouseName ?? "",
    formatQty(s.availableQty),
    formatQty(s.reservedQty),
    formatQty(s.inTransitQty),
    formatQty(s.minStock),
    s.levelKind === "out" ? "Sin stock" : s.levelKind === "low" ? "Bajo" : "Normal",
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <WarehouseIcon className="size-6 text-p3" />
            Niveles
            <PageHelpTooltip content={SCREEN_HELP["stock/niveles"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{stockItems.length} filas (producto × depósito)</p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
          <ExportButton
            headers={["Producto", "Depósito", "Disponible", "Reservado", "En tránsito", "Mínimo", "Nivel"]}
            {...exportRows}
            filename="stock-niveles"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
