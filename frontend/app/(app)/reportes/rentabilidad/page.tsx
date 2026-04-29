"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  getProfitabilityReport, getGrossMarginSummary,
  type ProfitabilityReport, type GrossMarginSummary,
} from "@/lib/actions/reports";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SCREEN_HELP } from "@/lib/screen-help";
import { ReportsShell, type DateRange } from "@/components/reports/reports-shell";

function marginBarColor(pct: number) {
  if (pct >= 20) return "bg-green-500";
  if (pct >= 10) return "bg-amber-500";
  return "bg-red-500";
}

function marginTextColor(pct: number) {
  if (pct >= 20) return "text-green-600";
  if (pct >= 10) return "text-amber-600";
  return "text-red-600";
}

function ProfitabilityRanking({ items }: { items: ProfitabilityReport[] }) {
  const maxMargin = Math.max(...items.map((i) => Math.abs(i.margin)), 1);
  return (
    <div className="space-y-2 p-4">
      {items.map((item) => {
        const barWidth = Math.round((Math.abs(item.margin) / maxMargin) * 100);
        return (
          <div key={item.product} className="flex items-center gap-3 min-w-0">
            <p
              className="w-[140px] shrink-0 text-sm truncate text-muted-foreground"
              title={item.product}
            >
              {item.product}
            </p>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div
                  className={cn("h-full rounded transition-all", marginBarColor(item.marginPercent))}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className={cn("text-sm font-medium tabular-nums shrink-0 w-24 text-right", marginTextColor(item.marginPercent))}>
                {formatMoney(item.margin)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RentabilidadContent({ range, onLoadingChange }: { range: DateRange; onLoadingChange: (v: boolean) => void }) {
  const [profitability, setProfitability] = React.useState<ProfitabilityReport[]>([]);
  const [gross, setGross] = React.useState<GrossMarginSummary>({ revenue: 0, cost: 0, margin: 0, marginPercent: 0 });

  React.useEffect(() => {
    onLoadingChange(true);
    Promise.all([getProfitabilityReport(range), getGrossMarginSummary(range)])
      .then(([p, g]) => {
        setProfitability(p);
        setGross(g);
      })
      .finally(() => onLoadingChange(false));
  }, [range, onLoadingChange]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Ingresos</p>
          <p className="text-lg font-semibold mt-1 tabular-nums">{formatMoney(gross.revenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Costos</p>
          <p className="text-lg font-semibold mt-1 tabular-nums">{formatMoney(gross.cost)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Margen bruto</p>
          <p className="text-lg font-semibold mt-1 tabular-nums">{formatMoney(gross.margin)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">% Margen</p>
          <p className={cn(
            "text-lg font-semibold mt-1 tabular-nums",
            gross.marginPercent >= 20 ? "text-green-600" : gross.marginPercent >= 10 ? "text-amber-600" : "text-red-600"
          )}>
            {gross.marginPercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {profitability.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No hay datos de rentabilidad por producto en el período seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b"><h3 className="font-medium">Top productos por margen</h3></div>
            <ProfitabilityRanking items={profitability.slice(0, 10)} />
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b"><h3 className="font-medium">Detalle por producto</h3></div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Costos</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitability.slice(0, 10).map((p) => (
                    <TableRow key={p.product}>
                      <TableCell className="font-medium max-w-[120px] truncate" title={p.product}>{p.product}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(p.revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(p.costs)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", marginTextColor(p.marginPercent))}>{formatMoney(p.margin)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", marginTextColor(p.marginPercent))}>{p.marginPercent.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportesRentabilidadPage() {
  return (
    <ReportsShell
      title="Rentabilidad"
      icon={TrendingUp}
      helpKey="reportes/rentabilidad"
      helpContent={SCREEN_HELP["reportes/rentabilidad"]}
    >
      {(range, _loading, setLoading) => <RentabilidadContent range={range} onLoadingChange={setLoading} />}
    </ReportsShell>
  );
}
