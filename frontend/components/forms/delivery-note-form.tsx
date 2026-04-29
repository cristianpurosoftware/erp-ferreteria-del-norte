"use client";

import * as React from "react";
import { Loader2, Search, CheckCircle2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { FormDrawer } from "./form-drawer";
import { Input } from "@/components/ui/input";
import { createDeliveryNote } from "@/lib/actions/delivery-notes";
import { getOrdersQuery, getOrderById } from "@/lib/actions/orders";
import type { Order } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium block mb-1.5">
      {children}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

const ELIGIBLE_STATUSES = ["ready_to_dispatch", "dispatched", "delivered", "completed"];

export function DeliveryNoteForm({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [fullOrder, setFullOrder] = React.useState<Order | null>(null);
  const [number, setNumber] = React.useState("");
  const [issueDate, setIssueDate] = React.useState(new Date().toISOString().split("T")[0]);

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setQ("");
      setResults([]);
      setSelectedOrder(null);
      setFullOrder(null);
      setNumber("");
      setIssueDate(new Date().toISOString().split("T")[0]);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      const trimmed = q.trim();
      if (!trimmed) { setResults([]); return; }
      setSearching(true);
      try {
        const r = await getOrdersQuery(`q=${encodeURIComponent(trimmed)}&limit=8`);
        setResults(r.items.filter((o) => ELIGIBLE_STATUSES.includes(o.status)));
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [q, open]);

  const handleSelectOrder = async (ord: Order) => {
    setSelectedOrder(ord);
    setFullOrder(null);
    setLoadingDetail(true);
    try {
      const full = await getOrderById(ord.id);
      setFullOrder(full);
    } catch {
      toast.error("No se pudo cargar el detalle del pedido");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleNext = () => {
    if (!selectedOrder) { toast.error("Seleccioná un pedido"); return; }
    if (loadingDetail) { toast.error("Esperá que cargue el detalle del pedido"); return; }
    if (!fullOrder?.items?.length) { toast.error("El pedido no tiene ítems"); return; }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!selectedOrder || !fullOrder?.items?.length) return;
    if (!number.trim()) { toast.error("El número de remito es requerido"); return; }
    setLoading(true);
    try {
      await createDeliveryNote({
        number: number.trim(),
        issueDate,
        customerId: selectedOrder.customerId,
        orderId: selectedOrder.id,
        items: fullOrder.items.map((i) => ({
          productId: i.productId,
          orderItemId: i.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      toast.success("Remito creado como borrador");
      onCreated();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear remito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo remito"
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
            <Label>Buscar pedido</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="N° de pedido o cliente..."
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
              {results.map((ord) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => handleSelectOrder(ord)}
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
                    {selectedOrder?.id === ord.id && (
                      loadingDetail
                        ? <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
                        : <CheckCircle2 className="size-4 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searching && q.trim() && results.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-4">Sin resultados</p>
          )}

          {selectedOrder && fullOrder && (
            <div className="rounded-lg bg-muted/50 p-3 border">
              <p className="text-xs text-muted-foreground mb-1">Seleccionado</p>
              <p className="text-sm font-medium">Pedido #{selectedOrder.number}</p>
              <p className="text-xs text-muted-foreground">{selectedOrder.customerName}</p>
              {fullOrder.items && (
                <p className="text-xs text-muted-foreground mt-0.5">{fullOrder.items.length} ítem(s)</p>
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
            <ChevronLeft className="size-3.5" /> Cambiar pedido
          </button>

          <div className="rounded-lg bg-muted/50 p-3 border">
            <p className="text-xs text-muted-foreground mb-1">Pedido origen</p>
            <p className="text-sm font-medium">#{selectedOrder?.number} · {selectedOrder?.customerName}</p>
            {fullOrder?.items && fullOrder.items.length > 0 && (
              <div className="mt-2 space-y-1 border-t pt-2">
                {fullOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                    <span className="truncate mr-2">{item.productName ?? item.productId.slice(0, 8)}</span>
                    <span className="shrink-0">{item.quantity} u. · {formatMoney(item.unitPrice)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label required>Número de remito</Label>
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="ej. 0001-00000001"
            />
            <p className="text-xs text-muted-foreground mt-1">Debe coincidir con el talonario</p>
          </div>

          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
        </div>
      )}
    </FormDrawer>
  );
}
