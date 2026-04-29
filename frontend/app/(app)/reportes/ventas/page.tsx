"use client";

import * as React from "react";
import { BarChart3, Users } from "lucide-react";
import {
  Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Cell, Pie, PieChart,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  getMonthlySalesReport, getOrdersByStatusReport, getTopCustomersReport,
  type SalesReport, type OrdersByStatusReportItem, type TopCustomerReportItem,
} from "@/lib/actions/reports";
import { getSalesLast30Days, type DailySales } from "@/lib/actions/dashboard";
import { formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/types";
import { SCREEN_HELP } from "@/lib/screen-help";
import { ReportsShell, type DateRange } from "@/components/reports/reports-shell";

const barColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function VentasContent({ range, onLoadingChange }: { range: DateRange; onLoadingChange: (v: boolean) => void }) {
  const [monthly, setMonthly] = React.useState<SalesReport[]>([]);
  const [daily, setDaily] = React.useState<DailySales[]>([]);
  const [byStatus, setByStatus] = React.useState<OrdersByStatusReportItem[]>([]);
  const [topCustomers, setTopCustomers] = React.useState<TopCustomerReportItem[]>([]);

  React.useEffect(() => {
    onLoadingChange(true);
    Promise.all([
      getMonthlySalesReport(range),
      getSalesLast30Days(range),
      getOrdersByStatusReport(),
      getTopCustomersReport({ limit: 10, ...range }),
    ])
      .then(([ms, ds, obs, tc]) => {
        setMonthly(ms);
        setDaily(ds);
        setByStatus(obs);
        setTopCustomers(tc);
      })
      .finally(() => onLoadingChange(false));
  }, [range, onLoadingChange]);

  if (monthly.length === 0 && daily.length === 0 && byStatus.length === 0 && topCustomers.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No hay datos de ventas disponibles.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b"><h3 className="font-medium">Ventas mensuales</h3></div>
          <div className="p-4">
            <ChartContainer config={{ amount: { label: "Monto" } }} className="h-[250px] w-full">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatMoney(Number(v))} />} />
                <Bar dataKey="amount" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b"><h3 className="font-medium">Ventas diarias (30 días)</h3></div>
          <div className="p-4">
            <ChartContainer config={{ amount: { label: "Monto" } }} className="h-[250px] w-full">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={4} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatMoney(Number(v))} />} />
                <Line type="monotone" dataKey="amount" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {byStatus.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b"><h3 className="font-medium">Pedidos por estado</h3></div>
            <div className="p-4">
              <ChartContainer config={{ count: { label: "Pedidos" } }} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={byStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: { status: string; count: number }) =>
                      `${ORDER_STATUS_LABELS[entry.status] ?? entry.status}: ${entry.count}`
                    }
                  >
                    {byStatus.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
          </div>
        )}
        {topCustomers.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h3 className="font-medium">Top clientes</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Facturado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.slice(0, 8).map((c) => (
                  <TableRow key={c.customerId}>
                    <TableCell className="font-medium">{c.customerName}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.orderCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(c.totalSpent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportesVentasPage() {
  return (
    <ReportsShell
      title="Ventas"
      icon={BarChart3}
      helpKey="reportes/ventas"
      helpContent={SCREEN_HELP["reportes/ventas"]}
    >
      {(range, _loading, setLoading) => <VentasContent range={range} onLoadingChange={setLoading} />}
    </ReportsShell>
  );
}
