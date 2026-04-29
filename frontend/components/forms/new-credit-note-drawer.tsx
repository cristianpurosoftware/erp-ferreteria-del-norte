"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { getIssuedInvoices } from "@/lib/actions/invoices";
import { createCreditNote } from "@/lib/actions/credit-notes";
import type { Invoice } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NewCreditNoteDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

interface ItemRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

const REASON_OPTIONS = [
  "Devolución",
  "Bonificación",
  "Error de facturación",
  "Diferencia de precio",
  "Otro",
];

const TODAY = new Date().toISOString().slice(0, 10);

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-foreground block mb-1.5">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

const selectCls = (hasError?: boolean) =>
  cn(
    "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
    hasError && "border-destructive focus:ring-destructive",
  );

export function NewCreditNoteDrawer({ open, onOpenChange, onCreated }: NewCreditNoteDrawerProps) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);

  // Step 2 fields
  const [reason, setReason] = React.useState("");
  const [salesPoint, setSalesPoint] = React.useState("00001");
  const [issueDate, setIssueDate] = React.useState(TODAY);
  const [jurisdictionId, setJurisdictionId] = React.useState("");
  const [items, setItems] = React.useState<ItemRow[]>([{ description: "", quantity: "", unitPrice: "" }]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  // Fetch invoices on open
  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedInvoice(null);
    setSearch("");
    setReason("");
    setSalesPoint("00001");
    setIssueDate(TODAY);
    setJurisdictionId("");
    setItems([{ description: "", quantity: "", unitPrice: "" }]);
    setErrors({});
    setLoadingInvoices(true);
    getIssuedInvoices()
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoadingInvoices(false));
  }, [open]);

  const filteredInvoices = React.useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (inv) =>
        (inv.number && inv.number.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.salesPoint && inv.salesPoint.toLowerCase().includes(q)),
    );
  }, [invoices, search]);

  function handleSelectInvoice(inv: Invoice) {
    setSelectedInvoice(inv);
    setStep(2);
  }

  function handleBack() {
    setStep(1);
    setErrors({});
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: "", unitPrice: "" }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof ItemRow, value: string) {
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  async function handleSubmit() {
    if (!selectedInvoice) return;
    const errs: Record<string, string> = {};
    if (!reason) errs.reason = "El motivo es obligatorio";
    const validItems = items.filter(
      (i) => Number(i.quantity) > 0 && Number(i.unitPrice) >= 0,
    );
    if (validItems.length === 0) errs.items = "Agregá al menos un ítem con cantidad mayor a 0";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await createCreditNote({
        customerId: selectedInvoice.customerId,
        originalInvoiceId: selectedInvoice.id,
        invoiceType: selectedInvoice.invoiceType ?? "A",
        salesPoint,
        issueDate,
        jurisdictionId: jurisdictionId || undefined,
        reason,
        items: validItems.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      });
      toast.success("Nota de crédito creada");
      onCreated?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear nota de crédito");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] flex flex-col p-0 gap-0"
        showCloseButton={false}
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base font-semibold">Nueva nota de crédito</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {step === 1 ? "Paso 1 de 2 — Seleccioná la factura original" : "Paso 2 de 2 — Completá los datos"}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-8 px-2 text-muted-foreground"
            >
              Cerrar
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {step === 1 && (
            <>
              <Input
                placeholder="Buscar por número o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-sm"
              />
              {loadingInvoices ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Cargando facturas...
                </div>
              ) : filteredInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {search ? "Sin resultados" : "No hay facturas emitidas"}
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-md border border-border divide-y divide-border">
                  {filteredInvoices.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => handleSelectInvoice(inv)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-medium truncate">
                          {inv.salesPoint && inv.number
                            ? `${inv.salesPoint}-${inv.number}`
                            : inv.number ?? "Sin N°"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{inv.customerName ?? "—"}</p>
                      </div>
                      <span className="text-sm tabular-nums shrink-0">{formatMoney(Number(inv.total))}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 2 && selectedInvoice && (
            <>
              <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm space-y-0.5">
                <p className="font-medium">
                  Factura:{" "}
                  <span className="font-mono">
                    {selectedInvoice.salesPoint && selectedInvoice.number
                      ? `${selectedInvoice.salesPoint}-${selectedInvoice.number}`
                      : selectedInvoice.number ?? "Sin N°"}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Cliente: {selectedInvoice.customerName ?? "—"}
                </p>
              </div>

              <div>
                <Label required>Motivo</Label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={selectCls(!!errors.reason)}
                >
                  <option value="">Seleccionar motivo...</option>
                  {REASON_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {errors.reason && <p className="text-xs text-destructive mt-1">{errors.reason}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Punto de venta</Label>
                  <Input
                    value={salesPoint}
                    onChange={(e) => setSalesPoint(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="00001"
                  />
                </div>
                <div>
                  <Label>Fecha de emisión</Label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label>Jurisdicción (opcional)</Label>
                <Input
                  value={jurisdictionId}
                  onChange={(e) => setJurisdictionId(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="ID de jurisdicción"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Ítems</Label>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addItem}>
                    <Plus className="size-3" />Agregar fila
                  </Button>
                </div>
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Descripción</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-20">Cant.</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-28">P. unitario</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => updateItem(idx, "description", e.target.value)}
                              placeholder="Descripción"
                              className="w-full h-7 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={row.quantity}
                              onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                              placeholder="0"
                              className="w-full h-7 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={row.unitPrice}
                              onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                              placeholder="0.00"
                              className="w-full h-7 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </td>
                          <td className="pr-2">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              disabled={items.length === 1}
                              className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
                            >
                              <X className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {errors.items && <p className="text-xs text-destructive mt-1">{errors.items}</p>}
              </div>
            </>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t shrink-0 flex-row gap-2">
          {step === 2 ? (
            <>
              <Button variant="outline" onClick={handleBack} disabled={submitting} className="flex-none">
                Atrás
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                Crear nota de crédito
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
