"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { FileArchive, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { getPaymentBatches, generatePaymentBatchFile, markPaymentBatchProcessed } from "@/lib/actions/treasury";
import type { PaymentBatch, PaymentBatchStatus } from "@/lib/types";
import { PAYMENT_BATCH_STATUS_LABELS } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/format";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { multiSelectFilterFn } from "@/lib/data-table-filters";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(PAYMENT_BATCH_STATUS_LABELS) as PaymentBatchStatus[]).map((s) => ({
  label: PAYMENT_BATCH_STATUS_LABELS[s],
  value: s,
}));

export default function BatchesPage() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<PaymentBatch[]>([]);
  const [acting, setActing] = React.useState<string | null>(null);

  const refetch = React.useCallback(
    () => getPaymentBatches({ limit: 500 }).then((r) => setItems(r.items)),
    [],
  );

  React.useEffect(() => { refetch().finally(() => setLoading(false)); }, [refetch]);

  const act = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setActing(key);
    try { await fn(); toast.success(msg); await refetch(); }
    catch (err) { toast.error("Error", { description: err instanceof Error ? err.message : "" }); }
    finally { setActing(null); }
  };

  const columns = React.useMemo<ColumnDef<PaymentBatch>[]>(
    () => [
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.date)}</span>,
        meta: { label: "Fecha" },
        sortingFn: (a, b) => new Date(a.original.date).getTime() - new Date(b.original.date).getTime(),
      },
      {
        id: "bankAccountName",
        accessorFn: (row) => row.bankAccountName ?? row.bankAccountId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cuenta" />,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.bankAccountName ?? "Cuenta eliminada"}</span>
        ),
        meta: { label: "Cuenta", placeholder: "Buscar cuenta...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "total",
        accessorKey: "total",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Total" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm font-medium block">
            {formatMoney(Number(row.original.total))}
          </span>
        ),
        meta: { label: "Total" },
        sortingFn: (a, b) => Number(a.original.total) - Number(b.original.total),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "processed" ? "default" : "outline"}>
            {PAYMENT_BATCH_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
        filterFn: multiSelectFilterFn,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="flex gap-1">
              {b.status === "draft" && (
                <Button size="sm" className="h-7" disabled={!!acting}
                  onClick={() => act(`g-${b.id}`, () => generatePaymentBatchFile(b.id), "Archivo generado")}>
                  {acting === `g-${b.id}` && <Loader2 className="size-3 mr-1 animate-spin" />}Generar archivo
                </Button>
              )}
              {b.status === "file_generated" && (
                <Button size="sm" className="h-7" disabled={!!acting}
                  onClick={() => act(`m-${b.id}`, () => markPaymentBatchProcessed(b.id), "Procesado")}>
                  Marcar procesado
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [acting],
  );

  const { table } = useDataTable({
    data: items,
    columns,
    pageCount: -1,
    getRowId: (row) => row.id,
    manualMode: false,
    initialState: {
      sorting: [{ id: "date", desc: true }],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const exportRows = buildExportRows(table, (b) => [
    b.date,
    b.bankAccountName ?? "",
    String(b.total),
    PAYMENT_BATCH_STATUS_LABELS[b.status] ?? b.status,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <FileArchive className="size-6 text-p3" />Batches de pago
            <PageHelpTooltip content={SCREEN_HELP["tesoreria/batches"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} lotes</p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={5}>
          <ExportButton
            headers={["Fecha", "Cuenta", "Total", "Estado"]}
            {...exportRows}
            filename="batches"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
