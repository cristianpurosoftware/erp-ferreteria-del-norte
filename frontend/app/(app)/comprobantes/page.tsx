"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  FileText,
  Tag,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  XCircle,
  Ban,
  Plus,
} from "lucide-react";
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
  getInvoicesQuery,
  getInvoicesSummary,
  issueInvoice,
  voidInvoice,
  cancelInvoice,
} from "@/lib/actions/invoices";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";
import { toast } from "sonner";
import { NewInvoiceDrawer } from "@/components/forms/new-invoice-drawer";

const statusLabels: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  pending_issue: "Pendiente",
  issued: "Emitido",
  cancelled: "Cancelado",
  voided: "Anulado",
};

const statusColors: Record<InvoiceStatus, string> = {
  draft:         "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  pending_issue: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  issued:        "bg-p3/10 text-p4 dark:text-p2",
  cancelled:     "bg-red-500/10 text-red-600 dark:text-red-400",
  voided:        "bg-red-500/10 text-red-500 dark:text-red-300",
};

const STATUS_OPTIONS = (Object.keys(statusLabels) as InvoiceStatus[]).map((s) => ({
  label: statusLabels[s], value: s,
}));

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ComprobantesPage() {
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [newDrawerOpen, setNewDrawerOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);

  const columns = React.useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar número, cliente o CAE...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "number",
        accessorFn: (row) => row.number ? `${row.salesPoint ? `${row.salesPoint}-` : ""}${row.number}` : "",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Número" />,
        cell: ({ row }) => (
          <Link href={`/comprobantes/${row.original.id}`} className="text-sm font-medium font-mono hover:underline">
            {row.original.number
              ? `${row.original.salesPoint ? `${row.original.salesPoint}-` : ""}${row.original.number}`
              : <span className="text-muted-foreground italic font-sans">Sin N°</span>}
          </Link>
        ),
        meta: { label: "Número" },
      },
      {
        id: "issueDate",
        accessorKey: "issueDate",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha emisión" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{formatDateTime(row.original.issueDate)}</span>
        ),
        meta: { label: "Fecha emisión" },
      },
      {
        id: "customerName",
        accessorFn: (row) => row.customerName ?? row.customerId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cliente" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.customerName ?? "Cliente eliminado"}
          </span>
        ),
        meta: { label: "Cliente" },
      },
      {
        id: "cae",
        accessorKey: "cae",
        header: "CAE",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.cae ?? "—"}</span>
        ),
        meta: { label: "CAE" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span
            className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}
          >
            {statusLabels[row.original.status]}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "total",
        accessorKey: "total",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Total" />,
        cell: ({ row }) => (
          <span className="text-right text-sm font-semibold tabular-nums block">
            {formatMoney(row.original.total)}
          </span>
        ),
        meta: { label: "Total" },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const inv = row.original;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href={`/comprobantes/${inv.id}`}>
                      <Eye /> Ver detalle
                    </Link>
                  </DropdownMenuItem>
                  {can("invoices:issue") && (inv.status === "draft" || inv.status === "pending_issue") && (
                    <DropdownMenuItem
                      onSelect={async () => {
                        try {
                          await issueInvoice(inv.id);
                          toast.success("Comprobante emitido");
                          fetchPageRef.current?.();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Error al emitir");
                        }
                      }}
                    >
                      <CheckCircle2 /> Emitir
                    </DropdownMenuItem>
                  )}
                  {(can("invoices:void") || can("invoices:cancel")) && <DropdownMenuSeparator />}
                  {can("invoices:void") && inv.status === "issued" && (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={async () => {
                        try {
                          await voidInvoice(inv.id);
                          toast.success("Comprobante anulado");
                          fetchPageRef.current?.();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Error");
                        }
                      }}
                    >
                      <Ban /> Anular
                    </DropdownMenuItem>
                  )}
                  {can("invoices:cancel") && (inv.status === "draft" || inv.status === "pending_issue") && (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={async () => {
                        try {
                          await cancelInvoice(inv.id);
                          toast.success("Comprobante cancelado");
                          fetchPageRef.current?.();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Error");
                        }
                      }}
                    >
                      <XCircle /> Cancelar
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
    data: invoices,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false, cae: false },
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
  const summaryParams = React.useMemo(() => {
    const p = new URLSearchParams(filterParams);
    p.delete("page"); p.delete("limit"); p.delete("sort");
    return p.toString();
  }, [filterParams]);

  const initialLoadDone = React.useRef(false);
  const fetchPageRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getInvoicesQuery(filterParams)
      .then((r) => {
        setInvoices(r.items);
        setPageCount(r.meta.totalPages);
        setTotalRows(r.meta.total);
      })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") {
      setNewDrawerOpen(true);
      router.replace("/comprobantes", { scroll: false });
    }
  }, [searchParams, router]);

  React.useEffect(() => {
    getInvoicesSummary(summaryParams)
      .then((s) => setTotalAmount(s.totalAmount))
      .catch(() => setTotalAmount(0));
  }, [summaryParams]);

  const exportRows = buildExportRows(table, (inv) => [
    `${inv.salesPoint ? `${inv.salesPoint}-` : ""}${inv.number ?? inv.id.slice(0, 8)}`,
    inv.issueDate ? new Date(inv.issueDate).toLocaleString("es-AR") : "—",
    inv.customerName ?? "",
    inv.cae ?? "",
    statusLabels[inv.status] ?? inv.status,
    String(Number(inv.total)),
  ]);

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FileText className="size-6 text-p3" />
              Comprobantes
              <PageHelpTooltip content={SCREEN_HELP.comprobantes} />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalRows} comprobantes · Total: {formatMoney(totalAmount)}
            </p>
          </div>
          {can("invoices:create") && (
            <Button size="sm" className="h-9 gap-1.5" onClick={() => setNewDrawerOpen(true)}>
              <Plus className="size-4" />
              Nueva factura
            </Button>
          )}
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
          <ExportButton
            headers={["Número", "Fecha emisión", "Cliente", "CAE", "Estado", "Total"]}
            {...exportRows}
            filename="comprobantes"
          />
        </ERPDataTable>
      </div>

      <NewInvoiceDrawer
        open={newDrawerOpen}
        onOpenChange={setNewDrawerOpen}
        onCreated={() => fetchPageRef.current?.()}
      />
    </div>
  );
}
