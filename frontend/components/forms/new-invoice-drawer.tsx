"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { getIssuedDeliveryNotes } from "@/lib/actions/delivery-notes";
import { getOrders } from "@/lib/actions/orders";
import { createInvoiceFull } from "@/lib/actions/invoices";
import { formatMoney } from "@/lib/format";
import type { DeliveryNote, Order } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

type SourceType = "delivery_note" | "order";

interface SelectedSource {
  id: string;
  type: SourceType;
  customerId: string;
  customerName: string;
  label: string;
  total: number;
  orderId?: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewInvoiceDrawer({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [fetching, setFetching] = React.useState(false);

  const [deliveryNotes, setDeliveryNotes] = React.useState<DeliveryNote[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);

  const [sourceType, setSourceType] = React.useState<SourceType>("delivery_note");
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<SelectedSource | null>(null);

  // Step 2 fields
  const [invoiceType, setInvoiceType] = React.useState("A");
  const [salesPoint, setSalesPoint] = React.useState("00001");
  const [issueDate, setIssueDate] = React.useState(todayISO);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Fetch data when drawer opens
  React.useEffect(() => {
    if (!open) return;
    setFetching(true);
    Promise.all([
      getIssuedDeliveryNotes(),
      getOrders({ status: "delivered,completed", limit: 100 }),
    ])
      .then(([dns, ordersResult]) => {
        setDeliveryNotes(dns);
        setOrders(ordersResult.items);
      })
      .catch(() => {
        toast.error("Error al cargar datos");
      })
      .finally(() => setFetching(false));
  }, [open]);

  // Reset state when drawer closes
  React.useEffect(() => {
    if (!open) {
      setStep(1);
      setSourceType("delivery_note");
      setSearch("");
      setSelected(null);
      setInvoiceType("A");
      setSalesPoint("00001");
      setIssueDate(todayISO());
      setNotes("");
    }
  }, [open]);

  const filteredDeliveryNotes = React.useMemo(() => {
    const q = search.toLowerCase();
    return deliveryNotes.filter(
      (dn) =>
        !q ||
        (dn.number ?? "").toLowerCase().includes(q) ||
        (dn.customerName ?? "").toLowerCase().includes(q),
    );
  }, [deliveryNotes, search]);

  const filteredOrders = React.useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        !q ||
        String(o.number).includes(q) ||
        (o.customerName ?? "").toLowerCase().includes(q),
    );
  }, [orders, search]);

  function handleSelectDeliveryNote(dn: DeliveryNote) {
    setSelected({
      id: dn.id,
      type: "delivery_note",
      customerId: dn.customerId,
      customerName: dn.customerName ?? "—",
      label: dn.salesPoint ? `${dn.salesPoint}-${dn.number}` : dn.number,
      total: dn.items?.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0) ?? 0,
      orderId: dn.orderId ?? undefined,
    });
  }

  function handleSelectOrder(order: Order) {
    setSelected({
      id: order.id,
      type: "order",
      customerId: order.customerId,
      customerName: order.customerName ?? "—",
      label: `Pedido #${order.number}`,
      total: Number(order.total),
    });
  }

  function handleNext() {
    if (!selected) return;
    setStep(2);
  }

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await createInvoiceFull({
        customerId: selected.customerId,
        invoiceType,
        salesPoint,
        issueDate: issueDate || undefined,
        notes: notes || undefined,
        deliveryNoteId: selected.type === "delivery_note" ? selected.id : undefined,
        orderId: selected.type === "order" ? selected.id : undefined,
      });
      toast.success("Borrador de factura creado");
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear factura");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle>Nueva factura</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : step === 1 ? (
            <>
              {/* Source type selector */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Origen del comprobante</Label>
                <RadioGroup
                  value={sourceType}
                  onValueChange={(v) => {
                    setSourceType(v as SourceType);
                    setSelected(null);
                    setSearch("");
                  }}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="delivery_note" id="src-dn" />
                    <label htmlFor="src-dn" className="text-sm cursor-pointer">
                      Remito emitido
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="order" id="src-order" />
                    <label htmlFor="src-order" className="text-sm cursor-pointer">
                      Pedido entregado
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Search input */}
              <div>
                <Input
                  placeholder={
                    sourceType === "delivery_note"
                      ? "Buscar por número o cliente..."
                      : "Buscar por número de pedido o cliente..."
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Source list */}
              <div className="overflow-y-auto max-h-64 rounded-md border border-border divide-y divide-border">
                {sourceType === "delivery_note" ? (
                  filteredDeliveryNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center">
                      No hay remitos emitidos sin facturar
                    </p>
                  ) : (
                    filteredDeliveryNotes.map((dn) => {
                      const isSelected = selected?.id === dn.id;
                      const label = dn.salesPoint
                        ? `${dn.salesPoint}-${dn.number}`
                        : dn.number;
                      const total =
                        dn.items?.reduce(
                          (acc, i) => acc + i.quantity * i.unitPrice,
                          0,
                        ) ?? 0;
                      return (
                        <button
                          key={dn.id}
                          type="button"
                          onClick={() => handleSelectDeliveryNote(dn)}
                          className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${
                            isSelected ? "bg-muted" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium font-mono truncate">{label}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {dn.customerName ?? "—"}
                              </p>
                            </div>
                            <span className="text-sm font-semibold tabular-nums shrink-0">
                              {total > 0 ? formatMoney(total) : "—"}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )
                ) : filteredOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    No hay pedidos entregados sin facturar
                  </p>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selected?.id === order.id;
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => handleSelectOrder(order)}
                        className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${
                          isSelected ? "bg-muted" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              Pedido #{order.number}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {order.customerName ?? "—"}
                            </p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums shrink-0">
                            {formatMoney(Number(order.total))}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Invoice details */}
              {selected && (
                <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {selected.type === "delivery_note" ? "Remito" : "Pedido"}
                  </p>
                  <p className="text-sm font-medium">{selected.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selected.customerName}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="invoiceType" className="text-sm font-medium mb-1.5 block">
                    Tipo de comprobante
                  </Label>
                  <Select value={invoiceType} onValueChange={setInvoiceType}>
                    <SelectTrigger id="invoiceType" className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Factura A</SelectItem>
                      <SelectItem value="B">Factura B</SelectItem>
                      <SelectItem value="C">Factura C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="salesPoint" className="text-sm font-medium mb-1.5 block">
                    Punto de venta
                  </Label>
                  <Input
                    id="salesPoint"
                    value={salesPoint}
                    onChange={(e) => setSalesPoint(e.target.value)}
                    className="h-9 text-sm font-mono"
                    placeholder="00001"
                    maxLength={5}
                  />
                </div>

                <div>
                  <Label htmlFor="issueDate" className="text-sm font-medium mb-1.5 block">
                    Fecha de emisión
                  </Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm font-medium mb-1.5 block">
                    Notas <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones adicionales..."
                    className="text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t flex flex-row items-center gap-2">
          {step === 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              disabled={submitting}
            >
              Atrás
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          {step === 1 ? (
            <Button size="sm" onClick={handleNext} disabled={!selected || fetching}>
              Siguiente
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Crear borrador
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
