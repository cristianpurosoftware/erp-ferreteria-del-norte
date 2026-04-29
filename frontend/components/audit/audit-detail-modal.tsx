"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import type { AuditEvent, User } from "@/lib/types";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { diffJson, formatValue, type DiffRow } from "@/lib/diff-json";
import { cn } from "@/lib/utils";

interface AuditDetailModalProps {
  event: AuditEvent | null;
  userMap: Map<string, User>;
  onClose: () => void;
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-24 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm min-w-0">{children}</span>
    </div>
  );
}

function DiffLine({ row }: { row: DiffRow }) {
  if (row.kind === "added") {
    return (
      <div className="flex items-start gap-2 py-1 px-2 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
        <Plus className="size-3.5 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-mono">{row.path}</div>
          <pre className="text-xs whitespace-pre-wrap break-all mt-0.5">{formatValue(row.next)}</pre>
        </div>
      </div>
    );
  }
  if (row.kind === "removed") {
    return (
      <div className="flex items-start gap-2 py-1 px-2 rounded bg-red-500/10 text-red-800 dark:text-red-300">
        <Minus className="size-3.5 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-mono">{row.path}</div>
          <pre className="text-xs whitespace-pre-wrap break-all mt-0.5">{formatValue(row.previous)}</pre>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 py-1 px-2 rounded bg-amber-500/10 text-amber-900 dark:text-amber-200">
      <ArrowRight className="size-3.5 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-mono">{row.path}</div>
        <div className="flex flex-col sm:flex-row gap-1 mt-0.5 text-xs">
          <pre className="flex-1 whitespace-pre-wrap break-all line-through opacity-70">
            {formatValue(row.previous)}
          </pre>
          <pre className="flex-1 whitespace-pre-wrap break-all">{formatValue(row.next)}</pre>
        </div>
      </div>
    </div>
  );
}

function ResultBadge({ result }: { result: string }) {
  const ok = result === "success";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px]",
        ok ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-red-500/10 text-red-700 border-red-500/30",
      )}
    >
      {ok ? "Exitoso" : result}
    </Badge>
  );
}

export function AuditDetailModal({ event, userMap, onClose }: AuditDetailModalProps) {
  const [showRaw, setShowRaw] = React.useState(false);

  const diffRows = React.useMemo<DiffRow[]>(() => {
    if (!event) return [];
    return diffJson(event.previous_state ?? {}, event.new_state ?? {});
  }, [event]);

  if (!event) return null;

  const actor =
    event.actor_type === "user" && event.actor_id
      ? userMap.get(event.actor_id)
        ? `${userMap.get(event.actor_id)!.first_name} ${userMap.get(event.actor_id)!.last_name}`
        : event.actor_id
      : event.actor_type === "system"
        ? "Sistema"
        : event.actor_type;

  const actionLabel = AUDIT_ACTION_LABELS[event.action] ?? event.action;
  const entityLabel = AUDIT_ENTITY_LABELS[event.entity_type] ?? event.entity_type;
  const requestId = (event.metadata && typeof event.metadata === "object" && "requestId" in event.metadata)
    ? String(event.metadata.requestId)
    : null;

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {actionLabel}
            <Badge variant="outline" className="text-[10px]">{entityLabel}</Badge>
            <ResultBadge result={event.result} />
          </DialogTitle>
          <DialogDescription>
            Evento de auditoría · {formatDate(event.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-lg border border-border p-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Metadata
            </h3>
            <MetaRow label="Actor">{actor}</MetaRow>
            <MetaRow label="Acción"><span className="font-mono text-xs">{event.action}</span></MetaRow>
            <MetaRow label="Entidad">
              <span className="font-mono text-xs">
                {event.entity_type}:{event.entityLabel ?? event.entity_id.slice(0, 8)}
              </span>
            </MetaRow>
            {event.ip_address && <MetaRow label="IP"><span className="font-mono text-xs">{event.ip_address}</span></MetaRow>}
            {requestId && <MetaRow label="Request"><span className="font-mono text-xs">{requestId}</span></MetaRow>}
          </section>

          <section className="rounded-lg border border-border p-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Cambios
            </h3>
            {diffRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {event.previous_state
                  ? "Sin cambios detectados."
                  : event.new_state
                    ? "Registro creado — no hay estado previo para comparar."
                    : "Sin datos de estado."}
              </p>
            ) : (
              <div className="space-y-1">
                {diffRows.map((r, i) => <DiffLine key={i} row={r} />)}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRaw((v) => !v)}
              className="w-full justify-start gap-2 h-9"
            >
              {showRaw ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              <span className="text-xs uppercase tracking-wider">JSON crudo</span>
            </Button>
            {showRaw && (
              <div className="p-3 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Previous state
                  </p>
                  <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-64 overflow-y-auto">
                    {event.previous_state ? JSON.stringify(event.previous_state, null, 2) : "null"}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    New state
                  </p>
                  <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-64 overflow-y-auto">
                    {event.new_state ? JSON.stringify(event.new_state, null, 2) : "null"}
                  </pre>
                </div>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
