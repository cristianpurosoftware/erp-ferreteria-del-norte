"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Vault, LockOpen, Lock, History } from "lucide-react";
import Link from "next/link";
import { getCashboxes, openCashbox, closeCashbox } from "@/lib/actions/cashbox";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Cashbox, CashboxStatus } from "@/lib/types";
import { PageHelpTooltip } from "@/components/page-help-tooltip";
import { SCREEN_HELP } from "@/lib/screen-help";

function CajaSkeleton() {
  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full space-y-6">
        <div className="space-y-2"><Skeleton className="h-7 w-24" /><Skeleton className="h-4 w-40" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[180px] rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

export default function CajaPage() {
  const [loading, setLoading] = useState(true);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [closeDialog, setCloseDialog] = useState<string | null>(null);
  const [initialAmount, setInitialAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () =>
    getCashboxes({ limit: 50 }).then((r) => setCashboxes(r.items));

  useEffect(() => {
    refresh().then(() => setLoading(false)).catch(() => setLoading(false));
  }, []);

  const handleOpen = async () => {
    if (!openDialog) return;
    setSubmitting(true);
    try {
      await openCashbox(openDialog, { openingBalance: Number(initialAmount) || 0 });
      await refresh();
      setOpenDialog(null);
      setInitialAmount("");
      toast.success("Caja abierta", { description: `Monto inicial: $${Number(initialAmount).toLocaleString("es-AR")}` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!closeDialog) return;
    setSubmitting(true);
    try {
      await closeCashbox(closeDialog, {
        closingBalance: Number(closingAmount) || 0,
        notes: closingNotes || undefined,
      });
      await refresh();
      setCloseDialog(null);
      setClosingAmount("");
      setClosingNotes("");
      toast.success("Caja cerrada", { description: `Monto de cierre: $${Number(closingAmount).toLocaleString("es-AR")}` });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <CajaSkeleton />;

  return (
    <>
      <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
        <div className="mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Vault className="size-6 text-p3" />
                Cajas
                <PageHelpTooltip content={SCREEN_HELP.caja} />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {cashboxes.length} cajas &middot; {cashboxes.filter((c) => c.status === "open").length} abiertas
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/caja/historial">
                <History className="size-3.5" />
                Historial
              </Link>
            </Button>
          </div>

          {/* Cashbox cards */}
          {cashboxes.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No hay cajas configuradas.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cashboxes.map((cb) => {
                const isOpen = cb.status === "open";
                const lastSession = cb.sessions?.[0];
                return (
                  <div key={cb.id} className="rounded-xl border border-border bg-card p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{cb.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5" title={cb.id}>{cb.branchId ? "Sucursal" : ""}</p>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        isOpen ? "bg-p3/10 text-p3" : "bg-gray-500/10 text-gray-500"
                      )}>
                        {isOpen ? "Abierta" : "Cerrada"}
                      </span>
                    </div>

                    {lastSession && (
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Apertura</span>
                          <span className="tabular-nums">{formatMoney(lastSession.openingBalance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Abierta</span>
                          <span className="text-xs">{formatDate(lastSession.openedAt)}</span>
                        </div>
                        {lastSession.closingBalance !== null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cierre</span>
                            <span className="tabular-nums">{formatMoney(lastSession.closingBalance)}</span>
                          </div>
                        )}
                        {lastSession.difference !== null && lastSession.difference !== 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Diferencia</span>
                            <span className={cn("tabular-nums font-medium", lastSession.difference > 0 ? "text-p3" : "text-red-500")}>
                              {lastSession.difference > 0 ? "+" : ""}{formatMoney(lastSession.difference)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      {isOpen ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5"
                          onClick={() => setCloseDialog(cb.id)}
                        >
                          <Lock className="size-3.5" />
                          Cerrar caja
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full gap-1.5"
                          onClick={() => setOpenDialog(cb.id)}
                        >
                          <LockOpen className="size-3.5" />
                          Abrir caja
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Open dialog */}
      <Dialog open={!!openDialog} onOpenChange={(o) => { if (!o) setOpenDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir caja</DialogTitle>
            <DialogDescription>Ingresá el monto inicial para abrir la caja.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleOpen(); }}>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Monto inicial</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(null)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>Abrir</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close dialog */}
      <Dialog open={!!closeDialog} onOpenChange={(o) => { if (!o) setCloseDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
            <DialogDescription>Ingresá el monto de cierre y opcionalmente notas.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleClose(); }}>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Monto de cierre</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Observaciones del cierre..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setCloseDialog(null)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>Cerrar caja</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
