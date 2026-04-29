"use client";

import * as React from "react";
import { Loader2, Search, CheckCircle2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { createInvoice } from "@/lib/actions/invoices";
import { getDeliveryNotesQuery } from "@/lib/actions/delivery-notes";
import { getOrdersQuery } from "@/lib/actions/orders";
import type { DeliveryNote, Order } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type SourceType = "delivery-note" | "order";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const INVOICE_TYPES = ["A", "B", "C", "E", "M"] as const;

function StepBar({ step }: { step: number }) {
  return (
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
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium block mb-1.5">
      {children}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

const ELIGIBLE_ORDER_STATUSES = ["delivered", "completed"];

export function InvoiceForm({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [sourceType, setSourceType] = React.useState<SourceType>("delivery-note");
  const [q, setQ] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [dnResults, setDnResults] = React.useState<DeliveryNote[]>([]);
  const [orderResults, setOrderResults] = React.useState<Order[]>([]);
  const [selectedDN, setSelectedDN] = React.useState<DeliveryNote | null>(null);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [invoiceType, setInvoiceType] = React.useState<string>("B");
  const [salesPoint, setSalesPoint] = React.useState("1");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setSourceType("delivery-note");
      setQ("");
      setDnResults([]);
      setOrderResults([]);
      setSelectedDN(null);
      setSelectedOrder(null);
      setInvoiceType("B");
      setSalesPoint("1");
      setNotes("");
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      const trimmed = q.trim();
      if (!trimmed) { setDnResults([]); setOrderResults([]); return; }
      setSearching(true);
      try {
        if (sourceType === "delivery-note") {
          const r = await getDeliveryNotesQuery(`q=${encodeURIComponent(trimmed)}&status=issued&limit=8`);
          setDnResults(r.items.filter((dn) => !dn.invoiceId));
        } else {
          const r = await getOrdersQuery(`q=${encodeURIComponent(trimmed)}&limit=8`);
          setOrderResults(r.items.filter((o) => ELIGIBLE_ORDER_STATUSES.includes(o.status)));
        }
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [q, sourceType, open]);

  const selected = sourceType === "delivery-note" ? selectedDN : selectedOrder;

  const changeSource = (type: SourceType) => {
    setSourceType(type);
    setQ("");
    setSelectedDN(null);
    setSelectedOrder(null);
    setDnResults([]);
    setOrderResults([]);
  };

  const handleNext = () => {
    if (!selected) { toast.error("Seleccioná un origen"); return; }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await createInvoice({
        customerId: selected.customerId,
        invoiceType: invoiceType || undefined,
        salesPoint: salesPoint || undefined,
        notes: notes || undefined,
        ...(sourceType === "delivery-note" && selectedDN
          ? { deliveryNoteId: selectedDN.id }
          : selectedOrder
          ? {
              orderId: selectedOrder.id,
              subtotal: Number(selectedOrder.subtotal),
              taxes: Number(selectedOrder.taxes),
              total: Number(selectedOrder.total),
            }
          : {}),
      });
      toast.success("Factura creada como borrador");
      onCreated();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear factura");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva factura"
      onSubmit={step === 1 ? handleNext : handleCreate}
      loading={loading}
      submitLabel={step === 1 ? "Siguiente" : "Crear borrador"}
    >
      <StepBar step={step} />

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>Origen</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "delivery-note" as SourceType, label: "Remito emitido" },
                { value: "order" as SourceType, label: "Pedido entregado" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => changeSource(opt.value)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border text-sm text-left transition-colors",
                    sourceType === opt.value
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Buscar {sourceType === "delivery-note" ? "remito" : "pedido"}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder={sourceType === "delivery-note" ? "N° o cliente..." : "N° de pedido o cliente..."}
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

          {!searching && sourceType === "delivery-note" && dnResults.length > 0 && (
            <div className="space-y-1.5">
              {dnResults.map((dn) => (
                <button
                  key={dn.id}
                  type="button"
                  onClick={() => setSelectedDN(dn)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg border text-left transition-colors",
                    selectedDN?.id === dn.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium">
                        {dn.salesPoint ? `${dn.salesPoint}-` : ""}{dn.number}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{dn.customerName ?? "Cliente eliminado"}</p>
                    </div>
                    {selectedDN?.id === dn.id && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searching && sourceType === "order" && orderResults.length > 0 && (
            <div className="space-y-1.5">
              {orderResults.map((ord) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => setSelectedOrder(ord)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg border text-left transition-colors",
                    selectedOrder?.id === ord.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Pedido #{ord.number}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {ord.customerName ?? "Cliente eliminado"} · {formatMoney(Number(ord.total))}
                      </p>
                    </div>
                    {selectedOrder?.id === ord.id && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searching && q.trim() && dnResults.length === 0 && orderResults.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-4">Sin resultados</p>
          )}

          {selected && (
            <div className="rounded-lg bg-muted/50 p-3 border">
              <p className="text-xs text-muted-foreground mb-1">Seleccionado</p>
              {selectedDN && (
                <>
                  <p className="text-sm font-medium">Remito {selectedDN.salesPoint ? `${selectedDN.salesPoint}-` : ""}{selectedDN.number}</p>
                  <p className="text-xs text-muted-foreground">{selectedDN.customerName}</p>
                </>
              )}
              {selectedOrder && (
                <>
                  <p className="text-sm font-medium">Pedido #{selectedOrder.number}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.customerName} · {formatMoney(Number(selectedOrder.total))}</p>
                </>
              )}
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
            <ChevronLeft className="size-3.5" /> Cambiar origen
          </button>

          <div className="rounded-lg bg-muted/50 p-3 border">
            <p className="text-xs text-muted-foreground mb-1">Origen</p>
            {selectedDN && (
              <>
                <p className="text-sm font-medium">Remito {selectedDN.salesPoint ? `${selectedDN.salesPoint}-` : ""}{selectedDN.number}</p>
                <p className="text-xs text-muted-foreground">{selectedDN.customerName}</p>
              </>
            )}
            {selectedOrder && (
              <>
                <p className="text-sm font-medium">Pedido #{selectedOrder.number}</p>
                <p className="text-xs text-muted-foreground">{selectedOrder.customerName}</p>
              </>
            )}
          </div>

          <div>
            <Label>Tipo de comprobante</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {INVOICE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setInvoiceType(t)}
                  className={cn(
                    "py-2 rounded-lg border text-sm font-mono font-bold transition-colors",
                    invoiceType === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Punto de venta</Label>
            <Input
              value={salesPoint}
              onChange={(e) => setSalesPoint(e.target.value)}
              placeholder="ej. 1"
            />
          </div>

          {selectedOrder && (
            <div className="rounded-lg bg-muted/50 p-3 border space-y-1">
              <p className="text-xs text-muted-foreground mb-1">Totales del pedido</p>
              {(
                [
                  ["Subtotal", selectedOrder.subtotal],
                  ["Impuestos", selectedOrder.taxes],
                  ["Total", selectedOrder.total],
                ] as [string, number][]
              ).map(([label, val], i) => (
                <div
                  key={label}
                  className={cn("flex justify-between text-sm", i === 2 && "font-semibold border-t pt-1 mt-1")}
                >
                  <span>{label}</span>
                  <span className="font-mono">{formatMoney(Number(val))}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label>Notas</Label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none min-h-[72px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Notas internas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      )}
    </FormDrawer>
  );
}
