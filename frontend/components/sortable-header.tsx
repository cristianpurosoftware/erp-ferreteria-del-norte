"use client";

import { useState } from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  label: string;
  column: string;
  activeColumn: string;
  direction: "asc" | "desc";
  onSort: (column: string) => void;
  className?: string;
}

export function SortableHeader({ label, column, activeColumn, direction, onSort, className }: SortableHeaderProps) {
  const isActive = activeColumn === column;
  const Icon = isActive ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead
      className={cn("cursor-pointer select-none hover:text-foreground transition-colors", className)}
      onClick={() => onSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={cn("size-3", isActive ? "text-foreground" : "text-muted-foreground/40")} />
      </span>
    </TableHead>
  );
}

/** Hook para sorting state */
export function useSortState(defaultCol: string, defaultDir: "asc" | "desc" = "desc") {
  const [sortCol, setSortCol] = useState(defaultCol);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultDir);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  return { sortCol, sortDir, toggleSort };
}
