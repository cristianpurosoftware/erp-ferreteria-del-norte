"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { ShieldCheck, Tag } from "lucide-react";
import { getFiscalAuthorizationsQuery } from "@/lib/actions/fiscal-authorizations";
import type { FiscalAuthorization, FiscalAuthStatus } from "@/lib/types";
import { FISCAL_AUTH_STATUS_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(FISCAL_AUTH_STATUS_LABELS) as FiscalAuthStatus[]).map((s) => ({
  label: FISCAL_AUTH_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<FiscalAuthStatus, string> = {
  pending:  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-p3/10 text-p4 dark:text-p2",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
  expired:  "bg-gray-500/10 text-gray-500 dark:text-gray-400",
};

export default function AutorizacionesPage() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<FiscalAuthorization[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);

  const columns = React.useMemo<ColumnDef<FiscalAuthorization>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar tipo o proveedor...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "documentType",
        accessorKey: "documentType",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Documento" />,
        cell: ({ row }) => <span className="text-sm">{row.original.documentType}</span>,
        meta: { label: "Documento" },
      },
      {
        id: "provider",
        accessorKey: "provider",
        header: "Proveedor",
        cell: ({ row }) => <span className="text-sm">{row.original.provider}</span>,
        meta: { label: "Proveedor" },
      },
      {
        id: "cae",
        accessorKey: "cae",
        header: "CAE",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.cae ?? "—"}</span>,
        meta: { label: "CAE" },
      },
      {
        id: "caeExpiration",
        accessorKey: "caeExpiration",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Vencimiento" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.caeExpiration?.slice(0, 10) ?? "—"}</span>
        ),
        meta: { label: "Vencimiento" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {FISCAL_AUTH_STATUS_LABELS[row.original.status]}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>
        ),
        meta: { label: "Fecha" },
      },
    ],
    [],
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
    return getFiscalAuthorizationsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  const exportRows = buildExportRows(table, (a) => [
    a.documentType,
    a.provider,
    a.cae ?? "",
    a.caeExpiration?.slice(0, 10) ?? "",
    FISCAL_AUTH_STATUS_LABELS[a.status] ?? a.status,
    a.createdAt,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="size-6 text-p3" />Autorizaciones fiscales
            <PageHelpTooltip content={SCREEN_HELP["fiscal/autorizaciones"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalRows} autorizaciones registradas · AFIP sandbox</p>
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
          <ExportButton
            headers={["Documento", "Proveedor", "CAE", "Vencimiento", "Estado", "Fecha"]}
            {...exportRows}
            filename="autorizaciones-fiscales"
          />
        </ERPDataTable>
      </div>
    </div>
  );
}
