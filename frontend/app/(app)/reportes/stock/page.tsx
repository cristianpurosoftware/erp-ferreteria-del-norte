"use client";

import * as React from "react";
import { Package, AlertTriangle } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getCriticalStock } from "@/lib/actions/reports";
import { getTopProducts, type TopProduct } from "@/lib/actions/dashboard";
import { cn } from "@/lib/utils";
import type { CriticalStockItem } from "@/lib/types";
import { SCREEN_HELP } from "@/lib/screen-help";
import { ReportsShell, type DateRange } from "@/components/reports/reports-shell";

const barColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function StockContent({ range, onLoadingChange }: { range: DateRange; onLoadingChange: (v: boolean) => void }) {
  const [critical, setCritical] = React.useState<CriticalStockItem[]>([]);
  const [topProducts, setTopProducts] = React.useState<TopProduct[]>([]);

  React.useEffect(() => {
    onLoadingChange(true);
    Promise.all([
      getCriticalStock({ limit: 50 }).catch(() => []),
      getTopProducts(10, range),
    ])
      .then(([cs, tp]) => {
        setCritical((cs ?? []) as CriticalStockItem[]);
        setTopProducts(tp);
      })
      .finally(() => onLoadingChange(false));
  }, [range, onLoadingChange]);

  const outOfStock = critical.filter((s) => Number(s.availableQty) === 0).length;
  const belowMin = critical.filter((s) => Number(s.availableQty) > 0 && Number(s.availableQty) <= Number(s.minStock)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Productos sin stock</p>
          <p className={cn("text-lg font-semibold mt-1 tabular-nums", outOfStock > 0 ? "text-red-600" : "text-muted-foreground")}>
            {outOfStock}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Bajo mínimo</p>
          <p className={cn("text-lg font-semibold mt-1 tabular-nums", belowMin > 0 ? "text-orange-600" : "text-muted-foreground")}>
            {belowMin}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Alertas totales</p>
          <p className="text-lg font-semibold mt-1 tabular-nums">{critical.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Top productos</p>
          <p className="text-lg font-semibold mt-1 tabular-nums">{topProducts.length}</p>
        </div>
      </div>

      {topProducts.length === 0 && critical.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No hay datos de stock disponibles.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {topProducts.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b"><h3 className="font-medium">Top productos vendidos</h3></div>
              <div className="p-4">
                <ChartContainer config={{ quantitySold: { label: "Unidades" } }} className="h-[300px] w-full">
                  <BarChart data={topProducts} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={140} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="quantitySold" radius={[0, 4, 4, 0]}>
                      {topProducts.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          )}
          {critical.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <AlertTriangle className="size-4 text-orange-500" />
                <h3 className="font-medium">Stock crítico</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {critical.slice(0, 10).map((s, i) => {
                    const available = Number(s.availableQty);
                    return (
                      <TableRow key={`${s.productId}-${s.warehouseId}-${i}`}>
                        <TableCell className="font-medium">{s.productName ?? s.productSku ?? "Producto eliminado"}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", available === 0 && "text-red-600 font-medium")}>
                          {available}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{Number(s.minStock)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportesStockPage() {
  return (
    <ReportsShell
      title="Stock"
      icon={Package}
      helpKey="reportes/stock"
      helpContent={SCREEN_HELP["reportes/stock"]}
    >
      {(range, _loading, setLoading) => <StockContent range={range} onLoadingChange={setLoading} />}
    </ReportsShell>
  );
}
