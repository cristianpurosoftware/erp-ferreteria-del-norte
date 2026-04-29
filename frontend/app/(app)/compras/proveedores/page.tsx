"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import {
  Truck,
  Plus,
  ArrowLeft,
  Tag,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  getSuppliers,
  getSuppliersQuery,
  getSuppliersSummary,
  deleteSupplier,
} from "@/lib/actions/purchases";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/lib/types";
import { ACTIVE_INACTIVE_LABELS } from "@/lib/types";
import { SupplierForm } from "@/components/forms/supplier-form";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";
import { toast } from "sonner";

void getSuppliers;

const STATUS_OPTIONS = [
  { label: "Activo", value: "active" },
  { label: "Inactivo", value: "inactive" },
];

const statusColors: Record<string, string> = {
  active:   "bg-p3/10 text-p4 dark:text-p2",
  inactive: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export default function ProveedoresPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [activeCount, setActiveCount] = React.useState(0);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editSupplier, setEditSupplier] = React.useState<Supplier | undefined>();

  const columns = React.useMemo<ColumnDef<Supplier>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar por nombre, CUIT o email...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.name}</span>
        ),
        meta: { label: "Nombre" },
      },
      {
        id: "taxId",
        accessorKey: "taxId",
        header: "ID Fiscal",
        cell: ({ row }) => <span className="text-sm text-muted-foreground font-mono">{row.original.taxId ?? "—"}</span>,
        meta: { label: "ID Fiscal" },
      },
      {
        id: "primaryContact",
        accessorKey: "primaryContact",
        header: "Contacto",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.primaryContact ?? "—"}</span>,
        meta: { label: "Contacto" },
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "Teléfono",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.phone ?? "—"}</span>,
        meta: { label: "Teléfono" },
      },
      {
        id: "paymentCondition",
        accessorKey: "paymentCondition",
        header: "Cond. pago",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.paymentCondition ?? "—"}</span>,
        meta: { label: "Cond. pago" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status] ?? statusColors.inactive)}>
            {ACTIVE_INACTIVE_LABELS[row.original.status] ?? row.original.status}
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
          const s = row.original;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => { setEditSupplier(s); setDrawerOpen(true); }}>
                    <Eye /> Ver detalle
                  </DropdownMenuItem>
                  {can("suppliers:update") && (
                    <DropdownMenuItem onSelect={() => { setEditSupplier(s); setDrawerOpen(true); }}>
                      <Pencil /> Editar
                    </DropdownMenuItem>
                  )}
                  {can("suppliers:delete") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={async () => {
                          if (!confirm(`¿Eliminar proveedor ${s.name}?`)) return;
                          await deleteSupplier(s.id);
                          toast.success("Proveedor eliminado");
                          fetchPageRef.current?.();
                        }}
                      >
                        <Trash2 /> Eliminar
                      </DropdownMenuItem>
                    </>
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
    data: suppliers,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false },
      sorting: [{ id: "name", desc: false }],
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
  const summaryParams = React.useMemo(() => {
    const p = new URLSearchParams(filterParams);
    p.delete("page"); p.delete("limit"); p.delete("sort");
    return p.toString();
  }, [filterParams]);

  const initialLoadDone = React.useRef(false);
  const fetchPageRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getSuppliersQuery(filterParams)
      .then((r) => {
        setSuppliers(r.items);
        setPageCount(r.meta.totalPages);
        setTotalRows(r.meta.total);
      })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getSuppliersSummary(summaryParams)
      .then((s) => setActiveCount(s.active))
      .catch(() => setActiveCount(0));
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (s) => [
    s.name,
    s.taxId ?? "",
    s.primaryContact ?? "",
    s.phone ?? "",
    s.paymentCondition ?? "",
    ACTIVE_INACTIVE_LABELS[s.status] ?? s.status,
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="size-8" asChild>
                <Link href="/compras"><ArrowLeft className="size-4" /></Link>
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                  <Truck className="size-6 text-p3" />
                  Proveedores
                  <PageHelpTooltip content={SCREEN_HELP["compras/proveedores"]} />
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {totalRows} proveedores · {activeCount} activos
                </p>
              </div>
            </div>
            {can("suppliers:create") && (
              <Button size="sm" className="h-9 gap-1.5" onClick={() => { setEditSupplier(undefined); setDrawerOpen(true); }}>
                <Plus className="size-4" />
                Nuevo Proveedor
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
            <ExportButton
              headers={["Nombre", "ID Fiscal", "Contacto", "Teléfono", "Cond. pago", "Estado"]}
              {...exportRows}
              filename="proveedores"
            />
          </ERPDataTable>
        </div>
      </div>

      <SupplierForm
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) { setEditSupplier(undefined); void fetchPage(); }
        }}
        supplier={editSupplier}
      />
    </>
  );
}
