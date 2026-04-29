"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  headers: string[];
  filename?: string;
  /** "toolbar" (default, h-8 to align with data-table toolbar) | "page" (h-9 for page headers) */
  variant?: "toolbar" | "page";
  className?: string;
  /**
   * Legacy: single-action mode. If provided (and `pageRows`/`allRows`/`fetchAllRows`
   * are not), renders a single button that exports `rows`.
   */
  rows?: string[][];
  /** Rows for the current page (client-side). Pairs with `allRows` or `fetchAllRows`. */
  pageRows?: string[][];
  /** All filtered rows (client-side pagination). */
  allRows?: string[][];
  /** Async fetch all filtered rows (server-side pagination). Returns CSV-ready arrays. */
  fetchAllRows?: () => Promise<string[][]>;
}

function downloadCsv(headers: string[], rows: string[][], filename: string) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({
  headers,
  filename = "export",
  variant = "toolbar",
  className,
  rows,
  pageRows,
  allRows,
  fetchAllRows,
}: ExportButtonProps) {
  const [fetching, setFetching] = React.useState(false);

  const isSplit = pageRows !== undefined && (allRows !== undefined || fetchAllRows !== undefined);
  const height = variant === "toolbar" ? "h-8" : "h-9";

  // Legacy single-button mode
  if (!isSplit) {
    const legacyRows = rows ?? [];
    return (
      <Button
        variant="outline"
        size="sm"
        aria-label="Exportar a CSV"
        className={cn("font-normal gap-1.5", height, className)}
        onClick={() => downloadCsv(headers, legacyRows, filename)}
      >
        <FileSpreadsheet className="size-4 text-[#217346]" />
        Exportar
      </Button>
    );
  }

  const handleExportPage = () => {
    downloadCsv(headers, pageRows ?? [], `${filename}-pagina`);
  };

  const handleExportAll = async () => {
    if (allRows) {
      downloadCsv(headers, allRows, filename);
      return;
    }
    if (!fetchAllRows) return;
    setFetching(true);
    try {
      const rows = await fetchAllRows();
      downloadCsv(headers, rows, filename);
    } catch (err) {
      toast.error("Error al exportar", {
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setFetching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Exportar a CSV"
          className={cn("font-normal gap-1.5", height, className)}
          disabled={fetching}
        >
          {fetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="size-4 text-[#217346]" />
          )}
          Exportar
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleExportPage} disabled={fetching}>
          Exportar página
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {pageRows?.length ?? 0}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportAll} disabled={fetching}>
          Exportar todo lo filtrado
          {allRows && (
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {allRows.length}
            </span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
