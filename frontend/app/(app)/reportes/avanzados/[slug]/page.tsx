"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdvancedReportTable } from "@/components/reports/advanced-report-table";
import { getReport, normalizeReportRows } from "@/lib/reports-registry";

export default function ReporteAvanzadoPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const def = getReport(slug);

  const [raw, setRaw] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    def?.paramsForm?.forEach((p) => {
      if (p.default) init[p.key] = p.default;
    });
    return init;
  });

  const load = useCallback(() => {
    if (!def) return;
    setLoading(true);
    def
      .fetcher(filters as Record<string, string | number | undefined>)
      .then(setRaw)
      .catch(() => setRaw(null))
      .finally(() => setLoading(false));
  }, [def, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () => (def && raw != null ? normalizeReportRows(def, raw) : []),
    [def, raw],
  );

  if (!def) {
    return (
      <div className="p-6">
        <Link href="/reportes/avanzados" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="size-4" />Volver
        </Link>
        <p className="mt-4">Reporte no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <Link
            href="/reportes/avanzados"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />Volver a reportes
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2 mt-3">
            <BarChart3 className="size-6 text-p3" />
            {def.label}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{def.description}</p>
        </div>

        {def.paramsForm && def.paramsForm.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 flex items-end gap-3 flex-wrap">
            {def.paramsForm.map((p) => (
              <div key={p.key}>
                <label className="text-xs font-medium text-muted-foreground uppercase block mb-1">{p.label}</label>
                <Input
                  type={p.type}
                  value={filters[p.key] ?? ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [p.key]: e.target.value }))}
                  className="h-9 text-sm w-44"
                />
              </div>
            ))}
            <Button size="sm" onClick={load}>Actualizar</Button>
          </div>
        )}

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <AdvancedReportTable def={def} raw={raw} rows={rows} />
        )}
      </div>
    </div>
  );
}
