"use client";

import * as React from "react";
import Link from "next/link";
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
  Tag,
  Plus,
  Pencil,
  MoreHorizontal,
  Play,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PromotionForm } from "@/components/forms/promotion-form";
import {
  getPromotionsQuery,
  activatePromotion,
  expirePromotion,
  cancelPromotion,
} from "@/lib/actions/promotions";
import { getSalesZones } from "@/lib/actions/sales-zones";
import type { Promotion, PromotionStatus, PromotionKind, SalesZone } from "@/lib/types";
import { PROMOTION_KIND_LABELS, PROMOTION_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const statusColors: Record<PromotionStatus, string> = {
  draft:     "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  active:    "bg-p3/10 text-p4 dark:text-p2",
  expired:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const STATUS_OPTIONS = (Object.keys(PROMOTION_STATUS_LABELS) as PromotionStatus[]).map((s) => ({
  label: PROMOTION_STATUS_LABELS[s], value: s,
}));
const KIND_OPTIONS = (Object.keys(PROMOTION_KIND_LABELS) as PromotionKind[]).map((k) => ({
  label: PROMOTION_KIND_LABELS[k], value: k,
}));

export default function PromocionesPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Promotion[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [zones, setZones] = React.useState<SalesZone[]>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editPromo, setEditPromo] = React.useState<Promotion | undefined>();

  const columns = React.useMemo<ColumnDef<Promotion>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar código o nombre...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Código" />,
        cell: ({ row }) => (
          <Link href={`/comercial/promociones/${row.original.id}`} className="font-mono text-sm hover:underline">
            {row.original.code}
          </Link>
        ),
        meta: { label: "Código" },
      },
      {
        id: "name",
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => <span className="font-medium text-sm">{row.original.name}</span>,
        meta: { label: "Nombre" },
      },
      {
        id: "kind",
        accessorKey: "kind",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {PROMOTION_KIND_LABELS[row.original.kind] ?? row.original.kind}
          </span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: KIND_OPTIONS },
        enableColumnFilter: true,
      },
      {
        id: "validFrom",
        accessorFn: (row) => row.validFrom,
        header: "Vigencia",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.validFrom ? row.original.validFrom.slice(0, 10) : "—"} / {row.original.validTo ? row.original.validTo.slice(0, 10) : "—"}
          </span>
        ),
        meta: { label: "Vigencia" },
      },
      {
        id: "priority",
        accessorKey: "priority",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Prioridad" />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.priority}</span>,
        meta: { label: "Prioridad" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {PROMOTION_STATUS_LABELS[row.original.status]}
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
          const p = row.original;
          const canEdit = can("promotions:update");
          const canActivate = can("promotions:activate") && p.status === "draft";
          const canExpire = can("promotions:activate") && p.status === "active";
          const canCancel = can("promotions:update") && p.status !== "cancelled" && p.status !== "expired";
          if (!canEdit && !canActivate && !canExpire && !canCancel) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {canEdit && (
                    <DropdownMenuItem onSelect={() => { setEditPromo(p); setDrawerOpen(true); }}>
                      <Pencil /> Editar
                    </DropdownMenuItem>
                  )}
                  {canActivate && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await activatePromotion(p.id); toast.success("Promoción activa"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Play /> Activar
                    </DropdownMenuItem>
                  )}
                  {canExpire && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await expirePromotion(p.id); toast.success("Promoción vencida"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Clock /> Vencer
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      {(canEdit || canActivate || canExpire) && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Cancelar promoción?")) return;
                        try { await cancelPromotion(p.id); toast.success("Promoción cancelada"); fetchPageRef.current?.(); }
                        catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                      }}>
                        <XCircle /> Cancelar
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
    data: items,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false },
      sorting: [{ id: "priority", desc: false }],
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
    return getPromotionsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getSalesZones({ limit: 500 }).then((z) => setZones(z.items)).catch(() => void 0);
  }, []);

  const exportRows = buildExportRows(table, (p) => [
    p.code,
    p.name,
    PROMOTION_KIND_LABELS[p.kind] ?? p.kind,
    `${p.validFrom ? p.validFrom.slice(0, 10) : ""} / ${p.validTo ? p.validTo.slice(0, 10) : ""}`,
    String(p.priority),
    PROMOTION_STATUS_LABELS[p.status] ?? p.status,
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <Tag className="size-6 text-p3" />
                Promociones
                <PageHelpTooltip content={SCREEN_HELP["comercial/promociones"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{totalRows} promociones</p>
            </div>
            {can("promotions:create") && (
              <Button size="sm" className="h-9 gap-1.5"
                onClick={() => { setEditPromo(undefined); setDrawerOpen(true); }}>
                <Plus className="size-4" />
                Nueva promoción
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={8}>
            <ExportButton
              headers={["Código", "Nombre", "Tipo", "Vigencia", "Prioridad", "Estado"]}
              {...exportRows}
              filename="promociones"
            />
          </ERPDataTable>
        </div>
      </div>

      <PromotionForm
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) { setEditPromo(undefined); fetchPageRef.current?.(); }
        }}
        promotion={editPromo}
        zones={zones}
      />
    </>
  );
}
