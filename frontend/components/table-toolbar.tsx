"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

interface TableToolbarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Column headers for CSV export */
  exportHeaders?: string[];
  /** Rows as string arrays for CSV export */
  exportRows?: string[][];
  exportFilename?: string;
}

export function TableToolbar({
  page,
  pageSize,
  total,
  onPageChange,
  exportHeaders,
  exportRows,
  exportFilename = "export",
}: TableToolbarProps) {
  const totalPages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const handleExport = () => {
    if (!exportHeaders || !exportRows) return;
    const csvContent = [
      exportHeaders.join(","),
      ...exportRows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center justify-between px-1 pt-3">
      <p className="text-xs text-muted-foreground tabular-nums">
        {total > 0 ? `${from}–${to} de ${total}` : "Sin resultados"}
      </p>

      <div className="flex items-center gap-2">
        {exportHeaders && exportRows && (
          <Button variant="ghost" size="xs" className="gap-1 text-xs text-muted-foreground" onClick={handleExport}>
            <Download className="size-3" />
            CSV
          </Button>
        )}

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums px-1.5">
              {page}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
