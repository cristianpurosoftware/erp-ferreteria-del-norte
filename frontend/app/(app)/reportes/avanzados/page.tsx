"use client";

import Link from "next/link";
import { BarChart3, DollarSign, Truck, Activity, ChevronRight } from "lucide-react";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";
import { listReportsByCategory } from "@/lib/reports-registry";

const CATEGORIES = [
  { key: "ventas" as const, label: "Ventas", icon: BarChart3 },
  { key: "financieros" as const, label: "Financieros", icon: DollarSign },
  { key: "logistica" as const, label: "Logística", icon: Truck },
  { key: "operativos" as const, label: "Operativos", icon: Activity },
];

export default function ReportesAvanzadosPage() {
  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="size-6 text-p3" />
            Reportes avanzados
            <PageHelpTooltip content={SCREEN_HELP["reportes/avanzados"]} />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analítica de gestión — distribuidora AR</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORIES.map((cat) => {
            const reports = listReportsByCategory(cat.key);
            if (reports.length === 0) return null;
            return (
              <div key={cat.key} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <cat.icon className="size-4 text-p3" />
                  <h3 className="font-medium text-sm">{cat.label}</h3>
                </div>
                <div className="divide-y">
                  {reports.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/reportes/avanzados/${r.slug}`}
                      className="flex items-start justify-between px-4 py-3 hover:bg-muted/30 transition-colors gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{r.label}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
