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
import { Receipt, Tag, MoreHorizontal, Send, XCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  getDeliveryNotesQuery,
  issueDeliveryNote,
  cancelDeliveryNote,
} from "@/lib/actions/delivery-notes";
import type { DeliveryNote, DeliveryNoteStatus } from "@/lib/types";
import { DELIVERY_NOTE_STATUS_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";
import { useSearchParams, useRouter } from "next/navigation";
import { NewDeliveryNoteDrawer } from "@/components/forms/new-delivery-note-drawer";

const STATUS_OPTIONS = (Object.keys(DELIVERY_NOTE_STATUS_LABELS) as DeliveryNoteStatus[]).map((s) => ({
  label: DELIVERY_NOTE_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<DeliveryNoteStatus, string> = {
  draft:     "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  issued:    "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  invoiced:  "bg-p3/10 text-p4 dark:text-p2",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function RemitosPage() {
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<DeliveryNote[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [newDrawerOpen, setNewDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") {
      setNewDrawerOpen(true);
      router.replace("/comprobantes/remitos", { scroll: false });
    }
  }, [searchParams, router]);

  const columns = React.useMemo<ColumnDef<DeliveryNote>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar número o cliente...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "number",
        accessorFn: (row) => `${row.salesPoint ? `${row.salesPoint}-` : ""}${row.number}`,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Número" />,
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.salesPoint ? `${row.original.salesPoint}-` : ""}{row.original.number}
          </span>
        ),
        meta: { label: "Número" },
      },
      {
        id: "customerName",
        accessorFn: (row) => row.customerName ?? row.customerId,
        header: "Cliente",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.customerName ?? "Cliente eliminado"}</span>
        ),
        meta: { label: "Cliente" },
      },
      {
        id: "issueDate",
        accessorKey: "issueDate",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.issueDate ? formatDate(row.original.issueDate) : "—"}
          </span>
        ),
        meta: { label: "Fecha" },
      },
      {
        id: "cae",
        accessorKey: "cae",
        header: "CAE",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.cae ?? "—"}</span>,
        meta: { label: "CAE" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {DELIVERY_NOTE_STATUS_LABELS[row.original.status]}
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
          const canIssue = can("delivery_notes:issue") && n.status === "draft";
          const canCancel = can("delivery_notes:cancel") && n.status !== "cancelled" && n.status !== "invoiced";
          if (!canIssue && !canCancel) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {canIssue && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await issueDeliveryNote(n.id); toast.success("Remito emitido"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Send /> Emitir
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      {canIssue && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Anular remito?")) return;
                        try { await cancelDeliveryNote(n.id); toast.success("Remito anulado"); fetchPageRef.current?.(); }
                        catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                      }}>
                        <XCircle /> Anular
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
      sorting: [{ id: "issueDate", desc: true }],
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
    return getDeliveryNotesQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  const exportRows = buildExportRows(table, (n) => [
    `${n.salesPoint ? `${n.salesPoint}-` : ""}${n.number}`,
    n.customerName ?? "",
    n.issueDate ?? "",
    n.cae ?? "",
    DELIVERY_NOTE_STATUS_LABELS[n.status] ?? n.status,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <Receipt className="size-6 text-p3" />Remitos
              <PageHelpTooltip content={SCREEN_HELP["comprobantes/remitos"]} />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{totalRows} remitos</p>
          </div>
          {can("delivery_notes:create") && (
            <Button size="sm" className="h-9 gap-1.5" onClick={() => setNewDrawerOpen(true)}>
              <Plus className="size-4" />Nuevo remito
            </Button>
          )}
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
          <ExportButton
            headers={["Número", "Cliente", "Fecha", "CAE", "Estado"]}
            {...exportRows}
            filename="remitos"
          />
        </ERPDataTable>
      </div>
      <NewDeliveryNoteDrawer open={newDrawerOpen} onOpenChange={setNewDrawerOpen} onCreated={() => fetchPageRef.current?.()} />
    </div>
  );
}
