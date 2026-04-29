"use client";

import * as React from "react";
import { Loader2, Search, CheckCircle2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { createCreditNote } from "@/lib/actions/credit-notes";
import { getInvoicesQuery } from "@/lib/actions/invoices";
import type { Invoice } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const REASONS = [
  "Devolución",
  "Bonificación",
  "Error de facturación",
  "Diferencia de precio",
  "Otro",
] as const;

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium block mb-1.5">
      {children}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

function invoiceLabel(inv: Invoice): string {
  if (!inv.number) return "Sin N°";
  return inv.salesPoint ? `${inv.salesPoint}-${inv.number}` : inv.number;
}

export function CreditNoteForm({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<Invoice[]>([]);
  const [selected, setSelected] = React.useState<Invoice | null>(null);
  const [reason, setReason] = React.useState<string>("");
  const [amount, setAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setQ("");
      setResults([]);
      setSelected(null);
      setReason("");
      setAmount("");
      setNotes("");
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      const trimmed = q.trim();
      if (!trimmed) { setResults([]); return; }
      setSearching(true);
      try {
        const r = await getInvoicesQuery(`q=${encodeURIComponent(trimmed)}&status=issued&limit=8`);
        setResults(r.items);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [q, open]);

  const handleSelect = (inv: Invoice) => {
    setSelected(inv);
    setAmount(String(Number(inv.total)));
  };

  const handleNext = () => {
    if (!selected) { toast.error("Seleccioná una factura emitida"); return; }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!selected) return;
    if (!reason) { toast.error("El motivo es requerido"); return; }
    const total = parseFloat(amount);
    if (isNaN(total) || total <= 0) { toast.error("Ingresá un importe válido"); return; }
    if (total > Number(selected.total)) {
      toast.error("El importe no puede superar el total de la factura");
      return;
    }
    setLoading(true);
    try {
      await createCreditNote({
        originalInvoiceId: selected.id,
        customerId: selected.customerId,
        reason,
        subtotal: total,
        taxes: 0,
        total,
        ...(notes ? { notes } : {}),
      });
      toast.success("Nota de crédito creada como borrador");
      onCreated();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear nota de crédito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva nota de crédito"
      onSubmit={step === 1 ? handleNext : handleCreate}
      loading={loading}
      submitLabel={step === 1 ? "Siguiente" : "Crear borrador"}
    >
      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0",
              step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}>{s}</div>
            {s < 2 && <div className={cn("flex-1 h-px", step > s ? "bg-primary" : "bg-border")} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>Buscar factura emitida</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="N° de factura o cliente..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {searching && (
            <div className="flex justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="space-y-1.5">
              {results.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => handleSelect(inv)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg border text-left transition-colors",
                    selected?.id === inv.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium">{invoiceLabel(inv)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {inv.customerName ?? "Cliente eliminado"} · {formatMoney(Number(inv.total))}
                      </p>
                    </div>
                    {selected?.id === inv.id && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searching && q.trim() && results.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-4">Sin resultados</p>
          )}

          {selected && (
            <div className="rounded-lg bg-muted/50 p-3 border">
              <p className="text-xs text-muted-foreground mb-1">Seleccionada</p>
              <p className="text-sm font-medium font-mono">{invoiceLabel(selected)}</p>
              <p className="text-xs text-muted-foreground">
                {selected.customerName} · {formatMoney(Number(selected.total))}
              </p>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-3.5" /> Cambiar factura
          </button>

          <div className="rounded-lg bg-muted/50 p-3 border">
            <p className="text-xs text-muted-foreground mb-1">Factura origen</p>
            <p className="text-sm font-medium font-mono">{selected && invoiceLabel(selected)}</p>
            <p className="text-xs text-muted-foreground">
              {selected?.customerName} · Total: {selected && formatMoney(Number(selected.total))}
            </p>
          </div>

          <div>
            <Label required>Motivo</Label>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm text-left transition-colors",
                    reason === r
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label required>Importe a acreditar</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            {selected && (
              <p className="text-xs text-muted-foreground mt-1">
                Máximo: {formatMoney(Number(selected.total))}
              </p>
            )}
          </div>

          <div>
            <Label>Notas</Label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none min-h-[72px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Observaciones (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      )}
    </FormDrawer>
  );
}
