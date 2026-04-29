"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { Landmark, Plus, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { getBankAccountsQuery, createBankAccount } from "@/lib/actions/treasury";
import { ACTIVE_INACTIVE_LABELS, type BankAccount } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const statusColors: Record<string, string> = {
  active:    "bg-p3/10 text-p4 dark:text-p2",
  inactive:  "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  suspended: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const STATUS_OPTIONS = Object.keys(ACTIVE_INACTIVE_LABELS).map((s) => ({
  label: ACTIVE_INACTIVE_LABELS[s], value: s,
}));

export default function CuentasBancariasPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<BankAccount[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [dialog, setDialog] = React.useState(false);
  const [acting, setActing] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", bankName: "", cbu: "", alias: "", accountNumber: "", currency: "ARS" });

  const columns = React.useMemo<ColumnDef<BankAccount>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar cuenta, banco o CBU...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Nombre" />,
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.name}</span>,
        meta: { label: "Nombre" },
      },
      {
        id: "bankName",
        accessorFn: (row) => row.bankName ?? "",
        header: "Banco",
        cell: ({ row }) => <span className="text-sm">{row.original.bankName ?? "—"}</span>,
        meta: { label: "Banco" },
      },
      {
        id: "cbu",
        accessorKey: "cbu",
        header: "CBU",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.cbu ?? "—"}</span>,
        meta: { label: "CBU" },
      },
      {
        id: "alias",
        accessorKey: "alias",
        header: "Alias",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.alias ?? "—"}</span>,
        meta: { label: "Alias" },
      },
      {
        id: "currency",
        accessorKey: "currency",
        header: "Moneda",
        cell: ({ row }) => <span className="text-sm">{row.original.currency}</span>,
        meta: { label: "Moneda" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status] ?? "bg-muted")}>
            {ACTIVE_INACTIVE_LABELS[row.original.status] ?? row.original.status}
          </span>
        ),
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_OPTIONS, icon: Tag },
        enableColumnFilter: true,
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

  const initialLoadDone = React.useRef(false);
  const fetchPageRef = React.useRef<() => void>(undefined);
  const fetchPage = React.useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    return getBankAccountsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  const create = async () => {
    setActing(true);
    try {
      const data = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      const created = await createBankAccount(data);
      toast.success("Cuenta creada", { description: created.name });
      setDialog(false);
      setForm({ name: "", bankName: "", cbu: "", alias: "", accountNumber: "", currency: "ARS" });
      fetchPageRef.current?.();
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "" });
    } finally {
      setActing(false);
    }
  };

  const exportRows = buildExportRows(table, (a) => [
    a.name,
    a.bankName ?? "",
    a.cbu ?? "",
    a.alias ?? "",
    a.currency,
    ACTIVE_INACTIVE_LABELS[a.status] ?? a.status,
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <Landmark className="size-6 text-p3" />Cuentas bancarias
                <PageHelpTooltip content={SCREEN_HELP["tesoreria/cuentas-bancarias"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{totalRows} cuentas</p>
            </div>
            {can("bank_accounts:create") && (
              <Button size="sm" className="gap-1.5" onClick={() => setDialog(true)}>
                <Plus className="size-4" />Nueva cuenta
              </Button>
            )}
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={6}>
            <ExportButton
              headers={["Nombre", "Banco", "CBU", "Alias", "Moneda", "Estado"]}
              {...exportRows}
              filename="cuentas-bancarias"
            />
          </ERPDataTable>
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva cuenta bancaria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium block mb-1.5">Nombre</label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-9 text-sm" placeholder="Caja de Ahorro ARS" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1.5">Banco</label><Input value={form.bankName} onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))} className="h-9 text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Moneda</label><Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} className="h-9 text-sm" /></div>
            </div>
            <div><label className="text-sm font-medium block mb-1.5">CBU</label><Input value={form.cbu} onChange={(e) => setForm((p) => ({ ...p, cbu: e.target.value }))} className="h-9 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1.5">Alias</label><Input value={form.alias} onChange={(e) => setForm((p) => ({ ...p, alias: e.target.value }))} className="h-9 text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Número</label><Input value={form.accountNumber} onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))} className="h-9 text-sm" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={create} disabled={!form.name || acting}>
              {acting && <Loader2 className="size-4 mr-2 animate-spin" />}Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
