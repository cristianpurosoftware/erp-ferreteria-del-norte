"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import {
  Banknote,
  Plus,
  Loader2,
  Hash,
  Building2,
  Tag,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import {
  createCheck,
  getChecksQuery,
  getChecksSummary,
  depositCheck,
  clearCheck,
  bounceCheck,
  endorseCheck,
  returnCheck,
  cancelCheck,
} from "@/lib/actions/treasury";
import type { Check, CheckStatus, CheckKind } from "@/lib/types";
import { CHECK_STATUS_LABELS, CHECK_KIND_LABELS } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = (Object.keys(CHECK_STATUS_LABELS) as CheckStatus[]).map((s) => ({
  label: CHECK_STATUS_LABELS[s], value: s,
}));
const KIND_OPTIONS = (Object.keys(CHECK_KIND_LABELS) as CheckKind[]).map((k) => ({
  label: CHECK_KIND_LABELS[k], value: k,
}));

const statusColors: Record<CheckStatus, string> = {
  received:              "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  in_portfolio:          "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  deposited:             "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  cleared:               "bg-p3/10 text-p4 dark:text-p2",
  bounced:               "bg-red-500/10 text-red-600 dark:text-red-400",
  endorsed:              "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  returned_to_customer:  "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  cancelled:             "bg-red-500/10 text-red-500 dark:text-red-300",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export default function ChequesPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [checks, setChecks] = React.useState<Check[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [dialog, setDialog] = React.useState(false);
  const [acting, setActing] = React.useState(false);
  const [form, setForm] = React.useState({
    number: "", bankName: "", accountHolder: "", cuit: "",
    amount: "", issueDate: "", dueDate: "",
    kind: "common" as CheckKind, ownOrThird: "third",
  });

  const columns = React.useMemo<ColumnDef<Check>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar número, banco o titular...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "number",
        accessorKey: "number",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Número" />,
        cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.number}</span>,
        meta: { label: "Número", icon: Hash },
      },
      {
        id: "bankName",
        accessorKey: "bankName",
        header: "Banco",
        cell: ({ row }) => <span className="text-sm">{row.original.bankName ?? "—"}</span>,
        meta: { label: "Banco", icon: Building2 },
      },
      {
        id: "cuit",
        accessorKey: "cuit",
        header: "CUIT",
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.cuit ?? "—"}</span>,
        meta: { label: "CUIT" },
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Monto" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm font-medium block">
            {formatMoney(Number(row.original.amount))}
          </span>
        ),
        meta: { label: "Monto" },
      },
      {
        id: "dueDate",
        accessorKey: "dueDate",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Vencimiento" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.dueDate)}</span>
        ),
        meta: { label: "Vencimiento" },
      },
      {
        id: "kind",
        accessorKey: "kind",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400">
            {CHECK_KIND_LABELS[row.original.kind]}
          </span>
        ),
        meta: { label: "Tipo", variant: "multiSelect", options: KIND_OPTIONS },
        enableColumnFilter: true,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {CHECK_STATUS_LABELS[row.original.status]}
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
          const c = row.original;
          const canDeposit = can("checks:deposit") && (c.status === "received" || c.status === "in_portfolio");
          const canClear = can("checks:clear") && c.status === "deposited";
          const canBounce = can("checks:bounce") && c.status === "deposited";
          const canEndorse = can("checks:endorse") && (c.status === "received" || c.status === "in_portfolio");
          const canReturn = can("checks:return") && (c.status === "received" || c.status === "in_portfolio" || c.status === "endorsed");
          const canCancel = can("checks:cancel") && c.status !== "cancelled" && c.status !== "cleared";
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <span className="cursor-default"><Eye /> Ver detalle</span>
                  </DropdownMenuItem>
                  {canDeposit && (
                    <DropdownMenuItem onSelect={async () => {
                      const bankAccountId = prompt("ID de cuenta bancaria:");
                      if (!bankAccountId) return;
                      try { await depositCheck(c.id, bankAccountId); toast.success("Cheque depositado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <ArrowLeftRight /> Depositar
                    </DropdownMenuItem>
                  )}
                  {canClear && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await clearCheck(c.id); toast.success("Cheque acreditado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <CheckCircle2 /> Acreditar
                    </DropdownMenuItem>
                  )}
                  {canEndorse && (
                    <DropdownMenuItem onSelect={async () => {
                      const supplierId = prompt("ID de proveedor:");
                      if (!supplierId) return;
                      try { await endorseCheck(c.id, supplierId); toast.success("Cheque endosado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <ArrowLeftRight /> Endosar
                    </DropdownMenuItem>
                  )}
                  {canReturn && (
                    <DropdownMenuItem onSelect={async () => {
                      try { await returnCheck(c.id); toast.success("Cheque devuelto al cliente"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <ArrowLeftRight /> Devolver al cliente
                    </DropdownMenuItem>
                  )}
                  {(canBounce || canCancel) && <DropdownMenuSeparator />}
                  {canBounce && (
                    <DropdownMenuItem variant="destructive" onSelect={async () => {
                      const reason = prompt("Motivo del rechazo:") ?? "Rechazado";
                      try { await bounceCheck(c.id, reason); toast.success("Cheque rechazado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
                      <Ban /> Rechazar
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <DropdownMenuItem variant="destructive" onSelect={async () => {
                      if (!confirm("¿Cancelar cheque?")) return;
                      try { await cancelCheck(c.id); toast.success("Cheque cancelado"); fetchPageRef.current?.(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                    }}>
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
    data: checks,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    manualMode: true,
    initialState: {
      columnVisibility: { q: false },
      sorting: [{ id: "dueDate", desc: true }],
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
    return getChecksQuery(filterParams)
      .then((r) => { setChecks(r.items); setPageCount(r.meta.totalPages); setTotalRows(r.meta.total); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getChecksSummary(summaryParams)
      .then((s) => setTotalAmount(s.totalAmount))
      .catch(() => setTotalAmount(0));
  }, [summaryParams]);

  const create = async () => {
    if (!form.number || !form.amount || !form.bankName || !form.accountHolder || !form.issueDate || !form.dueDate) return;
    setActing(true);
    try {
      const data: Record<string, unknown> = Object.fromEntries(
        Object.entries({ ...form, amount: Number(form.amount) }).filter(([, v]) => v !== "" && v !== undefined),
      );
      const created = await createCheck(data);
      toast.success("Cheque creado", { description: `N° ${created.number}${created.bankName ? ` · ${created.bankName}` : ""}` });
      setDialog(false);
      setForm({ number: "", bankName: "", accountHolder: "", cuit: "", amount: "", issueDate: "", dueDate: "", kind: "common", ownOrThird: "third" });
      await fetchPage();
    } catch (err) {
      toast.error("Error al crear cheque", { description: err instanceof Error ? err.message : "" });
    } finally {
      setActing(false);
    }
  };

  const exportRows = buildExportRows(table, (c) => [
    c.number,
    c.bankName ?? "",
    c.cuit ?? "",
    String(c.amount),
    c.issueDate?.slice(0, 10) ?? "",
    c.dueDate?.slice(0, 10) ?? "",
    CHECK_KIND_LABELS[c.kind] ?? c.kind,
    CHECK_STATUS_LABELS[c.status] ?? c.status,
  ]);

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <Banknote className="size-6 text-p3" />Cheques
              <PageHelpTooltip content={SCREEN_HELP["tesoreria/cheques"]} />
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalRows} cheques · Total: {formatMoney(totalAmount)}
            </p>
          </div>
          {can("checks:create") && (
            <Button size="sm" className="gap-1.5" onClick={() => setDialog(true)}>
              <Plus className="size-4" />Nuevo cheque
            </Button>
          )}
        </div>

        <ERPDataTable table={table} loading={loading} skeletonColumnCount={7}>
          <ExportButton
            headers={["Número", "Banco", "CUIT", "Monto", "Emisión", "Vencimiento", "Tipo", "Estado"]}
            {...exportRows}
            filename="cheques"
          />
        </ERPDataTable>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuevo cheque</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1.5">Número *</label><Input value={form.number} onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))} className="h-9 text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Monto *</label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} className="h-9 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1.5">Banco *</label><Input value={form.bankName} onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))} className="h-9 text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1.5">CUIT</label><Input value={form.cuit} onChange={(e) => setForm((p) => ({ ...p, cuit: e.target.value }))} className="h-9 text-sm" /></div>
            </div>
            <div><label className="text-sm font-medium block mb-1.5">Titular *</label><Input value={form.accountHolder} onChange={(e) => setForm((p) => ({ ...p, accountHolder: e.target.value }))} className="h-9 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1.5">Emisión *</label><Input type="date" value={form.issueDate} onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))} className="h-9 text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Vencimiento *</label><Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} className="h-9 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1.5">Tipo</label>
                <select value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as CheckKind }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="common">Común</option>
                  <option value="deferred">Diferido</option>
                </select>
              </div>
              <div><label className="text-sm font-medium block mb-1.5">Propio / Tercero</label>
                <select value={form.ownOrThird} onChange={(e) => setForm((p) => ({ ...p, ownOrThird: e.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="third">Tercero</option>
                  <option value="own">Propio</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={create} disabled={!form.number || !form.amount || !form.bankName || !form.accountHolder || !form.issueDate || !form.dueDate || acting}>
              {acting && <Loader2 className="size-4 mr-2 animate-spin" />}Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
