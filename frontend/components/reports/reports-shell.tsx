"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import type { SCREEN_HELP } from "@/lib/screen-help";

export interface DateRange {
  from: string;
  to: string;
}

function defaultFromDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ReportsShellProps {
  title: string;
  icon: LucideIcon;
  helpKey: keyof typeof SCREEN_HELP;
  helpContent: string;
  /** Render prop that receives the current date range. */
  children: (range: DateRange, loading: boolean, setLoading: (v: boolean) => void) => React.ReactNode;
}

export function ReportsShell({ title, icon: Icon, helpContent, children }: ReportsShellProps) {
  const [dateFrom, setDateFrom] = React.useState<string>(defaultFromDate);
  const [dateTo, setDateTo] = React.useState<string>(defaultToDate);
  const [loading, setLoading] = React.useState(true);

  const range = React.useMemo<DateRange>(() => ({ from: dateFrom, to: dateTo }), [dateFrom, dateTo]);

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Icon className="size-6 text-p3" />
            {title}
            <PageHelpTooltip content={helpContent} />
          </h1>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Desde
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-sm w-40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Hasta
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-sm w-40"
              />
            </div>
          </div>
        </div>

        {loading && <ReportsSkeleton />}
        <div className={loading ? "hidden" : undefined}>{children(range, loading, setLoading)}</div>
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[84px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  );
}
