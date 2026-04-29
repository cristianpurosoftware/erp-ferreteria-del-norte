"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExportButton } from "@/components/export-button";
import { ArrowLeft, History, Tag, Vault, User, Eye } from "lucide-react";
import { getCashboxes, getCashboxSessions } from "@/lib/actions/cashbox";
import { getTeam } from "@/lib/actions/team";
import type { Cashbox, CashboxSession, User as TeamUser } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ERPDataTable } from "@/components/data-table/erp-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useDataTable } from "@/hooks/use-data-table";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";
import { toast } from "sonner";

type SessionStatus = "open" | "closed" | "closed_with_diff";

function getSessionStatus(s: CashboxSession): SessionStatus {
  if (!s.closedAt) return "open";
  const diff = s.difference != null ? Math.abs(Number(s.difference)) : 0;
  return diff > 0.01 ? "closed_with_diff" : "closed";
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  open: "Abierta",
  closed: "Cerrada",
  closed_with_diff: "Cerrada c/ diferencia",
};

// Only "open" and "closed" are real server-side values. "closed_with_diff" is
// derived client-side from `difference` and filtered as "closed" on the server.
const STATUS_FILTER_OPTIONS = [
  { label: "Abierta", value: "open" },
  { label: "Cerrada", value: "closed" },
];

function formatDuration(openedAt: string, closedAt: string | null): string {
  if (!closedAt) return "—";
  const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime();
  if (ms < 0 || Number.isNaN(ms)) return "—";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Convert table state to server query params.
function buildParams(
  pagination: { pageIndex: number; pageSize: number },
  sorting: { id: string; desc: boolean }[],
  filters: { id: string; value: unknown }[],
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  };

  if (sorting.length) {
    params.sortBy = sorting[0].id;
    params.sortOrder = sorting[0].desc ? "DESC" : "ASC";
  }

  for (const f of filters) {
    const v = f.value;
    if (v == null) continue;

    if (f.id === "cashbox" && Array.isArray(v) && v.length) {
      params.cashboxId = (v as string[]).join(",");
    } else if (f.id === "openedBy" && Array.isArray(v) && v.length) {
      params.userId = (v as string[]).join(",");
    } else if (f.id === "status" && Array.isArray(v) && v.length) {
      params.status = (v as string[]).join(",");
    } else if (f.id === "openedAt" && Array.isArray(v)) {
      const [from, to] = v as (number | undefined)[];
      if (from) params.from = new Date(from).toISOString();
      if (to) {
        // Include the full end day
        const end = new Date(to + 24 * 60 * 60 * 1000 - 1);
        params.to = end.toISOString();
      }
    }
  }

  return params;
}

export default function CajaHistorialPage() {
  const [loading, setLoading] = React.useState(true);
  const [sessions, setSessions] = React.useState<CashboxSession[]>([]);
  const [total, setTotal] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(0);
  const [cashboxes, setCashboxes] = React.useState<Cashbox[]>([]);
  const [users, setUsers] = React.useState<TeamUser[]>([]);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  // Load filter options once (cashboxes + users).
  React.useEffect(() => {
    Promise.all([getCashboxes({ limit: 100 }), getTeam({ limit: 100 })])
      .then(([c, u]) => {
        setCashboxes(c.items);
        setUsers(u.items);
      })
      .catch(() => {});
  }, []);

  const cashboxOptions = React.useMemo(
    () => cashboxes.map((c) => ({ label: c.name, value: c.id })),
    [cashboxes],
  );

  const userOptions = React.useMemo(
    () =>
      users.map((u) => ({
        label: `${u.first_name} ${u.last_name}`.trim() || u.email,
        value: u.id,
      })),
    [users],
  );

  const userNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) m.set(u.id, `${u.first_name} ${u.last_name}`.trim() || u.email);
    return m;
  }, [users]);

  const columns = React.useMemo<ColumnDef<CashboxSession>[]>(
    () => [
      {
        id: "cashbox",
        accessorFn: (row) => row.cashboxId,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Caja" />,
        cell: ({ row }) => {
          const name = row.original.cashboxName ?? "Caja eliminada";
          return <span className="text-sm font-medium">{name}</span>;
        },
        meta: { label: "Caja", variant: "multiSelect", options: cashboxOptions, icon: Vault },
        enableColumnFilter: true,
      },
      {
        id: "openedAt",
        accessorKey: "openedAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Apertura" />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.openedAt)}</span>,
        meta: { label: "Apertura", variant: "dateRange" },
        enableColumnFilter: true,
      },
      {
        id: "openedBy",
        accessorFn: (row) => row.openedBy,
        header: "Abrió",
        cell: ({ row }) => {
          const name = row.original.openedByName ?? userNameById.get(row.original.openedBy) ?? "—";
          return <span className="text-sm">{name}</span>;
        },
        meta: { label: "Abrió", variant: "multiSelect", options: userOptions, icon: User },
        enableColumnFilter: true,
      },
      {
        id: "closedAt",
        accessorKey: "closedAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cierre" />,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {row.original.closedAt ? formatDate(row.original.closedAt) : "—"}
          </span>
        ),
      },
      {
        id: "closedBy",
        accessorFn: (row) => row.closedBy ?? "",
        header: "Cerró",
        cell: ({ row }) => {
          const id = row.original.closedBy;
          if (!id) return <span className="text-sm text-muted-foreground">—</span>;
          const name = row.original.closedByName ?? userNameById.get(id) ?? "—";
          return <span className="text-sm">{name}</span>;
        },
      },
      {
        id: "openingBalance",
        accessorKey: "openingBalance",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Apertura $" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm block">
            {formatMoney(Number(row.original.openingBalance))}
          </span>
        ),
      },
      {
        id: "closingBalance",
        accessorKey: "closingBalance",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cierre $" />,
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-sm block">
            {row.original.closingBalance != null ? formatMoney(Number(row.original.closingBalance)) : "—"}
          </span>
        ),
      },
      {
        id: "difference",
        accessorKey: "difference",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Diferencia" />,
        cell: ({ row }) => {
          const d = row.original.difference;
          if (d == null || Math.abs(Number(d)) < 0.01) {
            return <span className="text-right tabular-nums text-sm text-muted-foreground block">—</span>;
          }
          const n = Number(d);
          return (
            <span
              className={cn(
                "text-right tabular-nums text-sm font-medium block",
                n > 0 ? "text-p3" : "text-red-500",
              )}
            >
              {n > 0 ? "+" : ""}
              {formatMoney(n)}
            </span>
          );
        },
      },
      {
        id: "status",
        accessorFn: (row) => getSessionStatus(row),
        header: "Estado",
        enableSorting: false,
        cell: ({ row }) => {
          const s = getSessionStatus(row.original);
          return (
            <Badge
              variant={s === "open" ? "default" : s === "closed_with_diff" ? "destructive" : "outline"}
            >
              {STATUS_LABELS[s]}
            </Badge>
          );
        },
        meta: { label: "Estado", variant: "multiSelect", options: STATUS_FILTER_OPTIONS, icon: Tag },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setDetailId(row.original.id)}>
            <Eye className="size-3.5" />
            Detalle
          </Button>
        ),
      },
    ],
    [cashboxOptions, userOptions, userNameById],
  );

  const { table } = useDataTable({
    data: sessions,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    initialState: {
      sorting: [{ id: "openedAt", desc: true }],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  // Fetch whenever pagination / sorting / filters change.
  const { pagination, sorting, columnFilters } = table.getState();
  const paramsKey = React.useMemo(
    () => JSON.stringify({ pagination, sorting, columnFilters }),
    [pagination, sorting, columnFilters],
  );

  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    const params = buildParams(pagination, sorting, columnFilters);
    const requestId = ++requestIdRef.current;
    setLoading(true);
    getCashboxSessions(params)
      .then((r) => {
        if (requestId !== requestIdRef.current) return;
        setSessions(r.items);
        setTotal(r.meta.total);
        setPageCount(r.meta.totalPages);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setSessions([]);
        setTotal(0);
        setPageCount(0);
        toast.error("No se pudo cargar el historial de cajas");
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
    // biome-ignore lint/correctness/useExhaustiveDependencies: paramsKey captures the fetch inputs
  }, [paramsKey]);

  const sessionToRow = React.useCallback(
    (s: CashboxSession): string[] => [
      s.cashboxName ?? s.cashboxId,
      formatDate(s.openedAt),
      s.openedByName ?? userNameById.get(s.openedBy) ?? s.openedBy,
      s.closedAt ? formatDate(s.closedAt) : "",
      s.closedBy ? (s.closedByName ?? userNameById.get(s.closedBy) ?? s.closedBy) : "",
      String(s.openingBalance),
      s.closingBalance != null ? String(s.closingBalance) : "",
      s.difference != null ? String(s.difference) : "",
      STATUS_LABELS[getSessionStatus(s)],
      s.notes ?? "",
    ],
    [userNameById],
  );

  const pageRows = React.useMemo(() => sessions.map(sessionToRow), [sessions, sessionToRow]);

  const fetchAllRows = React.useCallback(async () => {
    // Backend caps `limit` at 100, so we page through until we've seen everything.
    const baseParams = buildParams(pagination, sorting, columnFilters);
    const chunk = 100;
    const out: string[][] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const r = await getCashboxSessions({ ...baseParams, page, limit: chunk });
      out.push(...r.items.map(sessionToRow));
      totalPages = r.meta.totalPages;
      page += 1;
    } while (page <= totalPages);
    return out;
  }, [pagination, sorting, columnFilters, sessionToRow]);

  const detail = React.useMemo(
    () => sessions.find((s) => s.id === detailId) ?? null,
    [sessions, detailId],
  );

  return (
    <>
      <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <History className="size-6 text-p3" />
                Historial de cajas
                <PageHelpTooltip content={SCREEN_HELP["caja/historial"]} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {total} sesiones registradas
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/caja">
                <ArrowLeft className="size-3.5" />
                Volver a cajas
              </Link>
            </Button>
          </div>

          <ERPDataTable table={table} loading={loading} skeletonColumnCount={10}>
            <ExportButton
              headers={[
                "Caja",
                "Apertura",
                "Abrió",
                "Cierre",
                "Cerró",
                "Apertura $",
                "Cierre $",
                "Diferencia",
                "Estado",
                "Notas",
              ]}
              pageRows={pageRows}
              fetchAllRows={fetchAllRows}
              filename="caja-historial"
            />
          </ERPDataTable>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetailId(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalle de sesión</DialogTitle>
            <DialogDescription>
              {detail?.cashboxName ?? "Caja eliminada"}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <p className="font-medium">{STATUS_LABELS[getSessionStatus(detail)]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duración</p>
                  <p className="font-medium tabular-nums">
                    {formatDuration(detail.openedAt, detail.closedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Abierta</p>
                  <p className="font-medium tabular-nums">{formatDate(detail.openedAt)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    por {detail.openedByName ?? userNameById.get(detail.openedBy) ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cerrada</p>
                  <p className="font-medium tabular-nums">
                    {detail.closedAt ? formatDate(detail.closedAt) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {detail.closedBy
                      ? `por ${detail.closedByName ?? userNameById.get(detail.closedBy) ?? "—"}`
                      : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Apertura</p>
                  <p className="font-medium tabular-nums">
                    {formatMoney(Number(detail.openingBalance))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cierre</p>
                  <p className="font-medium tabular-nums">
                    {detail.closingBalance != null ? formatMoney(Number(detail.closingBalance)) : "—"}
                  </p>
                </div>
                {detail.expectedBalance != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Esperado</p>
                    <p className="font-medium tabular-nums">
                      {formatMoney(Number(detail.expectedBalance))}
                    </p>
                  </div>
                )}
                {detail.difference != null && Math.abs(Number(detail.difference)) > 0.01 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Diferencia</p>
                    <p
                      className={cn(
                        "font-medium tabular-nums",
                        Number(detail.difference) > 0 ? "text-p3" : "text-red-500",
                      )}
                    >
                      {Number(detail.difference) > 0 ? "+" : ""}
                      {formatMoney(Number(detail.difference))}
                    </p>
                  </div>
                )}
              </div>

              {detail.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                    {detail.notes}
                  </div>
                </div>
              )}

              {detail.metadata && Object.keys(detail.metadata).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                  <pre className="rounded-md border border-border bg-muted/30 p-3 text-xs overflow-x-auto">
                    {JSON.stringify(detail.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
