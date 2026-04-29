"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExportButton } from "@/components/export-button";
import { buildExportRows } from "@/lib/data-table-export";
import { GitMerge, Upload, Loader2, Tag } from "lucide-react";
import {
  getBankStatementsQuery,
  getBankStatementsSummary,
  createBankStatement,
  getBankAccounts,
} from "@/lib/actions/treasury";
import { toast } from "sonner";
import type { BankStatement, BankAccount } from "@/lib/types";
import { BANK_STATEMENT_STATUS_LABELS, BANK_STATEMENT_LINE_KIND_LABELS } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { usePermissions } from "@/hooks/use-permissions";
import { buildListQuery } from "@/lib/list-query";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

const STATUS_OPTIONS = Object.keys(BANK_STATEMENT_STATUS_LABELS).map((s) => ({
  label: BANK_STATEMENT_STATUS_LABELS[s], value: s,
}));

const statusColors: Record<string, string> = {
  pending:              "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  partially_reconciled: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  reconciled:           "bg-p3/10 text-p4 dark:text-p2",
};

interface ParsedLine {
  date: string;
  description: string;
  amount: number;
  kind: "credit" | "debit";
  externalReference?: string;
}

function parseCSV(text: string): ParsedLine[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const amountRaw = cols[idx("amount") >= 0 ? idx("amount") : idx("monto")] ?? "0";
      const amount = Number(amountRaw.replace(/[^\d.-]/g, "")) || 0;
      const kindCol = cols[idx("kind") >= 0 ? idx("kind") : idx("tipo")] ?? "";
      const kind: "credit" | "debit" =
        kindCol.toLowerCase() === "credit" || kindCol.toLowerCase() === "credito"
          ? "credit"
          : kindCol.toLowerCase() === "debit" || kindCol.toLowerCase() === "debito"
            ? "debit"
            : amount >= 0
              ? "credit"
              : "debit";
      return {
        date: cols[idx("date") >= 0 ? idx("date") : idx("fecha")] ?? "",
        description: cols[idx("description") >= 0 ? idx("description") : idx("descripcion")] ?? "",
        amount: Math.abs(amount),
        kind,
        externalReference: cols[idx("reference") >= 0 ? idx("reference") : idx("referencia")] || undefined,
      };
    })
    .filter((l) => l.date && l.amount > 0);
}

export default function ConciliacionPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<BankStatement[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalRows, setTotalRows] = React.useState(0);
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([]);
  const [dialog, setDialog] = React.useState(false);
  const [acting, setActing] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<ParsedLine[]>([]);
  const [form, setForm] = React.useState({
    bankAccountId: "",
    periodStart: "",
    periodEnd: "",
    openingBalance: "",
    closingBalance: "",
  });

  const columns = React.useMemo<ColumnDef<BankStatement>[]>(
    () => [
      {
        id: "q",
        accessorFn: () => "",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { label: "Buscar", placeholder: "Buscar cuenta...", variant: "text" },
        enableColumnFilter: true,
      },
      {
        id: "bankAccountName",
        accessorFn: (row) => row.bankAccountName ?? row.bankAccountId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cuenta" />,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.bankAccountName ?? "Cuenta eliminada"}</span>
        ),
        meta: { label: "Cuenta" },
      },
      {
        id: "period",
        accessorFn: (row) => row.periodStart,
        header: "Período",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.periodStart.slice(0, 10)} — {row.original.periodEnd.slice(0, 10)}
          </span>
        ),
        meta: { label: "Período" },
      },
      {
        id: "openingBalance",
        accessorKey: "openingBalance",
        header: "Saldo inicial",
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm block">{formatMoney(Number(row.original.openingBalance))}</span>
        ),
        meta: { label: "Saldo inicial" },
      },
      {
        id: "closingBalance",
        accessorKey: "closingBalance",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Saldo final" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm font-medium block">{formatMoney(Number(row.original.closingBalance))}</span>
        ),
        meta: { label: "Saldo final" },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[row.original.status])}>
            {BANK_STATEMENT_STATUS_LABELS[row.original.status] ?? row.original.status}
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
      sorting: [{ id: "periodEnd", desc: true }],
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
    return getBankStatementsQuery(filterParams)
      .then((r) => { setItems(r.items); setPageCount(r.meta.totalPages); })
      .finally(() => { initialLoadDone.current = true; setLoading(false); });
  }, [filterParams]);
  fetchPageRef.current = fetchPage;

  React.useEffect(() => { void fetchPage(); }, [fetchPage]);

  React.useEffect(() => {
    getBankStatementsSummary(summaryParams).then((s) => setTotalRows(s.total)).catch(() => setTotalRows(0));
  }, [summaryParams]);

  React.useEffect(() => {
    getBankAccounts({ limit: 500 }).then((r) => setBankAccounts(r.items)).catch(() => void 0);
  }, []);

  const handleFile = async (f: File | null) => {
    setFile(f);
    if (!f) { setPreview([]); return; }
    const text = await f.text();
    const parsed = parseCSV(text);
    setPreview(parsed);
    if (parsed.length > 0 && !form.periodStart) {
      setForm((p) => ({ ...p, periodStart: parsed[0].date, periodEnd: parsed[parsed.length - 1].date }));
    }
  };

  const submit = async () => {
    if (!file || !form.bankAccountId || !form.periodStart || !form.periodEnd) return;
    setActing(true);
    try {
      const created = await createBankStatement({
        bankAccountId: form.bankAccountId,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        openingBalance: Number(form.openingBalance) || 0,
        closingBalance: Number(form.closingBalance) || 0,
        source: "csv",
        lines: preview,
      });
      toast.success("Extracto importado", {
        description: `${preview.length} movimientos en ${created.periodStart.slice(0, 10)} — ${created.periodEnd.slice(0, 10)}`,
      });
      setDialog(false);
      setFile(null);
      setPreview([]);
      setForm({ bankAccountId: "", periodStart: "", periodEnd: "", openingBalance: "", closingBalance: "" });
      fetchPageRef.current?.();
    } catch (err) {
      toast.error("Error al importar", { description: err instanceof Error ? err.message : "" });
    } finally {
      setActing(false);
    }
  };

  const exportRows = buildExportRows(table, (s) => [
    s.bankAccountName ?? "",
    `${s.periodStart.slice(0, 10)} — ${s.periodEnd.slice(0, 10)}`,
    String(s.openingBalance),
    String(s.closingBalance),
    BANK_STATEMENT_STATUS_LABELS[s.status] ?? s.status,
  ]);

  return (
    <>
      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <GitMerge className="size-6 text-p3" />Conciliación bancaria
                <PageHelpTooltip content={SCREEN_HELP["tesoreria/conciliacion"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{totalRows} extractos</p>
            </div>
            {can("bank_statements:create") && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setDialog(true)}
                disabled={bankAccounts.length === 0}
                title={bankAccounts.length === 0 ? "Cargá al menos una cuenta bancaria primero" : undefined}
              >
                <Upload className="size-4" />
                Importar extracto
              </Button>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Importá tus extractos bancarios para iniciar la conciliación. La conciliación automática sugiere matches
            con pagos y cheques por monto y fecha.
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={5}>
            <ExportButton
              headers={["Cuenta", "Período", "Saldo inicial", "Saldo final", "Estado"]}
              {...exportRows}
              filename="extractos-bancarios"
            />
          </ERPDataTable>
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar extracto bancario</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Cuenta bancaria *</label>
              <select
                value={form.bankAccountId}
                onChange={(e) => setForm((p) => ({ ...p, bankAccountId: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Seleccioná una cuenta</option>
                {bankAccounts.map((ba) => (
                  <option key={ba.id} value={ba.id}>
                    {ba.name}{ba.bankName ? ` · ${ba.bankName}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Archivo CSV *</label>
              <Input type="file" accept=".csv" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} className="h-9 text-sm" />
              <p className="text-xs text-muted-foreground mt-1">
                Columnas esperadas: <code className="font-mono">date/fecha, description/descripcion, amount/monto, kind/tipo, reference</code>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">Período inicio *</label>
                <Input type="date" value={form.periodStart} onChange={(e) => setForm((p) => ({ ...p, periodStart: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Período fin *</label>
                <Input type="date" value={form.periodEnd} onChange={(e) => setForm((p) => ({ ...p, periodEnd: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Saldo inicial</label>
                <Input type="number" step="0.01" value={form.openingBalance} onChange={(e) => setForm((p) => ({ ...p, openingBalance: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Saldo final</label>
                <Input type="number" step="0.01" value={form.closingBalance} onChange={(e) => setForm((p) => ({ ...p, closingBalance: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            {preview.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Vista previa ({preview.length} movimientos · primeros 10 mostrados):
                </p>
                <div className="rounded-lg border border-border max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Descripción</th>
                        <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Monto</th>
                        <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 10).map((l, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">{l.date}</td>
                          <td className="px-2 py-1 truncate max-w-48">{l.description}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatMoney(l.amount)}</td>
                          <td className="px-2 py-1">{BANK_STATEMENT_LINE_KIND_LABELS[l.kind] ?? l.kind}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={!file || !form.bankAccountId || !form.periodStart || !form.periodEnd || acting}>
              {acting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Importar {preview.length > 0 ? `(${preview.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
