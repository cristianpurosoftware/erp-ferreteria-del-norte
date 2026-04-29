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
  FileMinus,
  Tag,
  MoreHorizontal,
  Send,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCreditNotesQuery,
  issueCreditNote,
  applyCreditNote,
  cancelCreditNote,
} from "@/lib/actions/credit-notes";
import type { CreditNote, CreditNoteStatus } from "@/lib/types";
import { CREDIT_NOTE_STATUS_LABELS } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";
import { useSearchParams, useRouter } from "next/navigation";
import { NewCreditNoteDrawer } from "@/components/forms/new-credit-note-drawer";

const STATUS_OPTIONS = (Object.keys(CREDIT_NOTE_STATUS_LABELS) as CreditNoteStatus[]).map((s) => ({
  label: CREDIT_NOTE_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<CreditNoteStatus, string> = {
  draft:         "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  pending_issue: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  issued:        "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  applied:       "bg-p3/10 text-p4 dark:text-p2",
  voided:        "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function NotasCreditoPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<CreditNote[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [newDrawerOpen, setNewDrawerOpen] = React.useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  React.useEffect(() => {
    if (searchParams.get("new") === "1") {
      setNewDrawerOpen(true);
      router.replace("/comprobantes/notas-credito", { scroll: false });
    }
  }, [searchParams, router]);

  const columns = React.useMemo<ColumnDef<CreditNote>[]>(
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
        accessorFn: (row) => row.number ? `${row.salesPoint ? `${row.salesPoint}-` : ""}${row.number}` : "",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Número" />,
        cell: ({ row }) => (
          row.original.number
            ? <span className="font-mono text-sm">{row.original.salesPoint ? `${row.original.salesPoint}-` : ""}{row.original.number}</span>
            : <span className="text-sm text-muted-foreground italic">Sin N°</span>
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
        id: "total",
        accessorKey: "total",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Total" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm block">{formatMoney(Number(row.original.total))}</span>
        ),
        meta: { label: "Total" },
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
            {CREDIT_NOTE_STATUS_LABELS[row.original.status]}
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
          const canIssue = can("credit_notes:issue") && (n.status === "draft" || n.status === "pending_issue");
          const canApply = can("credit_notes:apply") && n.status === "issued";
          const canCancel = can("credit_notes:cancel") && n.status !== "applied" && n.status !== "voided";
          if (!canIssue && !canApply && !canCancel) return null;
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
                      try { await issueCreditNote(n.id); toast.success("Nota emitida"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Send /> Emitir
                    </DropdownMenuItem>
                  )}
                  {canApply && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await applyCreditNote(n.id); toast.success("Nota aplicada"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle2 /> Aplicar
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      {(canIssue || canApply) && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={async () => {
                        if (!confirm("¿Anular nota de crédito?")) return;
                        try { await cancelCreditNote(n.id); toast.success("Nota anulada"); fetchPageRef.current?.(); }
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
    return getCreditNotesQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  const exportRows = buildExportRows(table, (n) => [
    `${n.salesPoint ? `${n.salesPoint}-` : ""}${n.number ?? n.id.slice(0, 8)}`,
    n.customerName ?? "",
    n.issueDate ?? "",
    String(n.total),
    n.cae ?? "",
    CREDIT_NOTE_STATUS_LABELS[n.status] ?? n.status,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <FileMinus className="size-6 text-p3" />Notas de crédito
              <PageHelpTooltip content={SCREEN_HELP["comprobantes/notas-credito"]} />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{totalRows} notas de crédito</p>
          </div>
          {can("credit_notes:create") && (
            <Button size="sm" className="h-9 gap-1.5" onClick={() => setNewDrawerOpen(true)}>
              <Plus className="size-4" />Nueva nota de crédito
            </Button>
          )}
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
          <ExportButton
            headers={["Número", "Cliente", "Fecha", "Total", "CAE", "Estado"]}
            {...exportRows}
            filename="notas-credito"
          />
        </ERPDataTable>
      </div>
      <NewCreditNoteDrawer open={newDrawerOpen} onOpenChange={setNewDrawerOpen} onCreated={() => fetchPageRef.current?.()} />
    </div>
  );
}
