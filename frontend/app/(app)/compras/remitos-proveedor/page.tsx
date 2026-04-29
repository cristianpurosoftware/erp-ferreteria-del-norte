"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import {
  Receipt,
  Tag,
  MoreHorizontal,
  PackageCheck,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSupplierDeliveryNotesQuery,
  receiveSupplierDeliveryNote,
  closeSupplierDeliveryNote,
} from "@/lib/actions/supplier-delivery-notes";
import type { SupplierDeliveryNote, SupplierDeliveryNoteStatus } from "@/lib/types";
import { SUPPLIER_DELIVERY_NOTE_STATUS_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(SUPPLIER_DELIVERY_NOTE_STATUS_LABELS) as SupplierDeliveryNoteStatus[]).map((s) => ({
  label: SUPPLIER_DELIVERY_NOTE_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<SupplierDeliveryNoteStatus, string> = {
  pending:  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  received: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  closed:   "bg-p3/10 text-p4 dark:text-p2",
};

export default function RemitosProveedorPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<SupplierDeliveryNote[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);

  const columns = React.useMemo<ColumnDef<SupplierDeliveryNote>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar número o proveedor...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "supplierDeliveryNoteNumber",
        accessorKey: "supplierDeliveryNoteNumber",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Número" />,
        cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.supplierDeliveryNoteNumber}</span>,
        meta: { label: "Número" },
      },
      {
        id: "supplierName",
        accessorFn: (row) => row.supplierName ?? row.supplierId,
        header: "Proveedor",
        cell: ({ row }) => <span className="text-sm">{row.original.supplierName ?? "Proveedor eliminado"}</span>,
        meta: { label: "Proveedor" },
      },
      {
        id: "warehouseName",
        accessorFn: (row) => row.warehouseName ?? "",
        header: "Depósito",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.warehouseName ?? "—"}</span>,
        meta: { label: "Depósito" },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Creado" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
        meta: { label: "Creado" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {SUPPLIER_DELIVERY_NOTE_STATUS_LABELS[row.original.status] ?? row.original.status}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const n = row.original;
          const canReceive = can("supplier_delivery_notes:receive") && n.status === "pending";
          const canClose = can("supplier_delivery_notes:receive") && n.status === "received";
          if (!canReceive && !canClose) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {canReceive && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await receiveSupplierDeliveryNote(n.id); toast.success("Remito recibido"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <PackageCheck /> Recibir
                    </DropdownMenuItem>
                  )}
                  {canClose && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await closeSupplierDeliveryNote(n.id); toast.success("Remito cerrado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Lock /> Cerrar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [can],
  );

  const { table } = useDataTable({
    data: items,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false },
      sorting: [{ id: "createdAt", desc: true }],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const state = table.getState();
  const filterParams = React.useMemo(
    () => buildListQuery({
      pagination: state.pagination,
      sorting: state.sorting,
      filters: state.columnFilters,
    }).toString(),
    [state.pagination, state.sorting, state.columnFilters],
  );

  const initialLoadDone = React.useRef(false);
  const fetchPageRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getSupplierDeliveryNotesQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  const exportRows = buildExportRows(table, (n) => [
    n.supplierDeliveryNoteNumber,
    n.supplierName ?? "",
    n.warehouseName ?? "",
    n.createdAt,
    SUPPLIER_DELIVERY_NOTE_STATUS_LABELS[n.status] ?? n.status,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <Receipt className="size-6 text-p3" />Remitos de proveedor
            <PageHelpTooltip content={SCREEN_HELP["compras/remitos-proveedor"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalRows} remitos</p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
          <ExportButton
            headers={["Número", "Proveedor", "Depósito", "Creado", "Estado"]}
            {...exportRows}
            filename="remitos-proveedor"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
