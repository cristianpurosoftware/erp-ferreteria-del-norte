"use client";

import type { Column, Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import * as React from "react";

import { DataTableDateFilter } from "@/components/data-table/data-table-date-filter";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableSliderFilter } from "@/components/data-table/data-table-slider-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
  children,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table],
  );

  const onReset = React.useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex w-full flex-wrap items-center justify-between gap-2 p-1",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {columns.map((column) => (
          <DataTableToolbarFilter key={column.id} column={column} />
        ))}
        {isFiltered && (
          <Button
            aria-label="Limpiar filtros"
            variant="outline"
            size="sm"
            className="h-8 border-dashed"
            onClick={onReset}
          >
            <X />
            Limpiar
          </Button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        <DataTableViewOptions table={table} align="end" />
      </div>
    </div>
  );
}
interface DebouncedTextFilterProps<TData> {
  column: Column<TData>;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
  unit?: string;
  debounceMs?: number;
}

function DebouncedTextFilter<TData>({
  column,
  placeholder,
  type,
  inputMode,
  className,
  unit,
  debounceMs = 300,
}: DebouncedTextFilterProps<TData>) {
  const external = (column.getFilterValue() as string) ?? "";
  const [local, setLocal] = React.useState(external);
  const lastCommittedRef = React.useRef(external);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    if (external !== lastCommittedRef.current) {
      setLocal(external);
      lastCommittedRef.current = external;
    }
  }, [external]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const commit = React.useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      lastCommittedRef.current = value;
      column.setFilterValue(value === "" ? undefined : value);
    },
    [column],
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocal(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastCommittedRef.current = value;
      column.setFilterValue(value === "" ? undefined : value);
    }, debounceMs);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit(local);
  };

  const input = (
    <Input
      type={type}
      inputMode={inputMode}
      placeholder={placeholder}
      value={local}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={cn("h-8 w-40 lg:w-56", className)}
    />
  );

  if (unit) {
    return (
      <div className="relative">
        {input}
        <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
          {unit}
        </span>
      </div>
    );
  }
  return input;
}

interface DataTableToolbarFilterProps<TData> {
  column: Column<TData>;
}

function DataTableToolbarFilter<TData>({
  column,
}: DataTableToolbarFilterProps<TData>) {
  {
    const columnMeta = column.columnDef.meta;

    const onFilterRender = React.useCallback(() => {
      if (!columnMeta?.variant) return null;

      switch (columnMeta.variant) {
        case "text":
          return (
            <DebouncedTextFilter
              column={column}
              placeholder={columnMeta.placeholder ?? columnMeta.label}
            />
          );

        case "number":
          return (
            <DebouncedTextFilter
              column={column}
              placeholder={columnMeta.placeholder ?? columnMeta.label}
              type="number"
              inputMode="numeric"
              className={cn("w-[120px]", columnMeta.unit && "pr-8")}
              unit={columnMeta.unit}
            />
          );

        case "range":
          return (
            <DataTableSliderFilter
              column={column}
              title={columnMeta.label ?? column.id}
            />
          );

        case "date":
        case "dateRange":
          return (
            <DataTableDateFilter
              column={column}
              title={columnMeta.label ?? column.id}
              multiple={columnMeta.variant === "dateRange"}
            />
          );

        case "select":
        case "multiSelect":
          return (
            <DataTableFacetedFilter
              column={column}
              title={columnMeta.label ?? column.id}
              options={columnMeta.options ?? []}
              multiple={columnMeta.variant === "multiSelect"}
            />
          );

        default:
          return null;
      }
    }, [column, columnMeta]);

    return onFilterRender();
  }
}
