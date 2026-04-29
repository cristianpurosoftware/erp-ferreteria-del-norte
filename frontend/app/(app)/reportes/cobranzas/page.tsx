"use client";

import * as React from "react";
import { DollarSign } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  getAgingReport, getCustomerDebtReport,
  type AgingReport,
} from "@/lib/actions/reports";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CustomerDebtItem } from "@/lib/types";
import { SCREEN_HELP } from "@/lib/screen-help";
import { ReportsShell, type DateRange } from "@/components/reports/reports-shell";

function CobranzasContent({ range, onLoadingChange }: { range: DateRange; onLoadingChange: (v: boolean) => void }) {
  const [aging, setAging] = React.useState<AgingReport[]>([]);
  const [debt, setDebt] = React.useState<CustomerDebtItem[]>([]);

  React.useEffect(() => {
    onLoadingChange(true);
    Promise.all([getAgingReport(), getCustomerDebtReport({ limit: 10 }).catch(() => [])])
      .then(([a, cd]) => {
        setAging(a);
        setDebt((cd ?? []) as CustomerDebtItem[]);
      })
      .finally(() => onLoadingChange(false));
    // range is kept for shell compatibility though this endpoint is rangeless.
    void range;
  }, [range, onLoadingChange]);

  const totalDebt = aging.reduce((s, a) => s + Number(a.amount), 0);
  const overdueDebt = aging.filter((a) => a.range !== "Al día").reduce((s, a) => s + Number(a.amount), 0);
  const overdueCustomers = aging.filter((a) => a.range !== "Al día").reduce((s, a) => s + Number(a.count), 0);
  const avgDebt = debt.length > 0 ? debt.reduce((s, c) => s + Number(c.balance), 0) / debt.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Deuda total</p>
          <p className="text-lg font-semibold mt-1 tabular-nums">{formatMoney(totalDebt)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Deuda vencida</p>
          <p className={cn("text-lg font-semibold mt-1 tabular-nums", overdueDebt > 0 ? "text-red-600" : "text-muted-foreground")}>
            {formatMoney(overdueDebt)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Clientes en mora</p>
          <p className="text-lg font-semibold mt-1 tabular-nums">{overdueCustomers}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Prom. deuda/cliente</p>
          <p className="text-lg font-semibold mt-1 tabular-nums">{formatMoney(avgDebt)}</p>
        </div>
      </div>

      {aging.length === 0 && debt.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No hay datos de cobranzas disponibles.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b"><h3 className="font-medium">Aging de cobranzas</h3></div>
              <div className="p-4">
                <ChartContainer config={{ amount: { label: "Monto" } }} className="h-[250px] w-full">
                  <PieChart>
                    <Pie data={aging} dataKey="amount" nameKey="range" cx="50%" cy="50%" outerRadius={80} label={({ value }) => formatMoney(Number(value))}>
                      {aging.map((a, i) => <Cell key={i} fill={a.color} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatMoney(Number(v))} />} />
                  </PieChart>
                </ChartContainer>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="font-medium">Detalle por rango</h3>
              {aging.map((a) => (
                <div key={a.range} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ backgroundColor: a.color }} />
                    <span className="text-sm">{a.range}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatMoney(a.amount)}</p>
                    <p className="text-xs text-muted-foreground">{a.count} clientes</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {debt.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b"><h3 className="font-medium">Top deudores</h3></div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Deuda total</TableHead>
                    <TableHead className="text-right">Vencido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debt.slice(0, 10).map((c) => {
                    const overdue = Number(c.overdueBalance);
                    return (
                      <TableRow key={c.customerId}>
                        <TableCell className="font-medium">{c.customerName ?? "Cliente eliminado"}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(Number(c.balance))}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", overdue > 0 && "text-red-600 font-medium")}>
                          {formatMoney(overdue)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ReportesCobranzasPage() {
  return (
    <ReportsShell
      title="Cobranzas"
      icon={DollarSign}
      helpKey="reportes/cobranzas"
      helpContent={SCREEN_HELP["reportes/cobranzas"]}
    >
      {(range, _loading, setLoading) => <CobranzasContent range={range} onLoadingChange={setLoading} />}
    </ReportsShell>
  );
}
