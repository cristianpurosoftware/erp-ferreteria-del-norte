"use client";

import { formatMoney, formatDate } from "@/lib/format";
import type { ReportColumn, ReportDefinition, ReportSummary } from "@/lib/reports-registry";

interface Props {
  def: ReportDefinition;
  raw: unknown;
  rows: Array<Record<string, unknown>>;
}

function renderCell(col: ReportColumn, value: unknown): React.ReactNode {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "number" && Number.isNaN(value));
  if (isEmpty) {
    return <span className="text-muted-foreground">{col.fallback ?? "—"}</span>;
  }
  switch (col.type) {
    case "money":
      return <span className="tabular-nums">{formatMoney(Number(value))}</span>;
    case "number":
      return <span className="tabular-nums">{Number(value).toLocaleString("es-AR", { maximumFractionDigits: 2 })}</span>;
    case "percent":
      return <span className="tabular-nums">{Number(value).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%</span>;
    case "date":
      return <span>{formatDate(value as string | Date)}</span>;
    case "enum": {
      const label = col.enumLabels?.[String(value)] ?? String(value);
      return <span>{label}</span>;
    }
    case "text":
    default:
      return <span>{String(value)}</span>;
  }
}

function renderSummary(s: ReportSummary, value: number): string {
  if (s.type === "money") return formatMoney(value);
  if (s.type === "percent") return `${value.toFixed(1)}%`;
  return value.toLocaleString("es-AR");
}

export function AdvancedReportTable({ def, raw, rows }: Props) {
  const visible = def.columns.filter((c) => !c.hidden);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        {def.emptyState}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {def.summaries && def.summaries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {def.summaries.map((s) => {
            const v = s.compute(raw, rows);
            return (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className="text-lg font-semibold tabular-nums mt-1">{renderSummary(s, v)}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              {visible.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap ${
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t">
                {visible.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 text-sm whitespace-nowrap ${
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""
                    }`}
                  >
                    {renderCell(c, row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
