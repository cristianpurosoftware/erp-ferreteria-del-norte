"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ScanLine, Trash2, Search, Printer, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { findProductBySku, createPosSale } from "@/lib/actions/pos";
import type { CreatePosSaleInput, PosSaleLine, PosSaleResult } from "@/lib/api/endpoints/pos";
import { PosSalePrintDocument } from "@/components/pos/pos-sale-print-document";

// ─── Local shapes ──────────────────────────────────────────
interface WarehouseOpt { id: string; name: string; }
interface CustomerOpt {
  id: string;
  label: string;
  creditLimit: number;
  currentBalance: number;
}
interface CartLine {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number; // percent (0-100)
}

const fmtAR = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

const lineSubtotal = (l: CartLine): number => {
  const gross = l.unitPrice * l.quantity;
  return Math.max(0, gross * (1 - l.discount / 100));
};

interface PosClientProps {
  warehouses: WarehouseOpt[];
  customers: CustomerOpt[];
}

export function PosClient({ warehouses, customers }: PosClientProps) {
  // Default to "Salón" warehouse if present, else first.
  const defaultWh = warehouses.find((w) => /sal[oó]n/i.test(w.name))?.id ?? warehouses[0]?.id ?? "";

  const [warehouseId, setWarehouseId] = useState(defaultWh);
  const [customer, setCustomer] = useState<CustomerOpt | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [skuInput, setSkuInput] = useState("");
  const [skuLoading, setSkuLoading] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [pay, setPay] = useState({ cash: 0, card: 0, transfer: 0, account: 0 });
  const [submitting, startSubmit] = useTransition();
  const [ticket, setTicket] = useState<PosSaleResult | null>(null);

  const skuRef = useRef<HTMLInputElement>(null);

  // Re-focus SKU input whenever the cart changes or after submit clears it.
  useEffect(() => {
    if (!ticket) skuRef.current?.focus();
  }, [cart.length, ticket]);

  const subtotal = cart.reduce((acc, l) => acc + lineSubtotal(l), 0);
  const discountAmount = subtotal * (globalDiscount / 100);
  const total = Math.max(0, subtotal - discountAmount);
  const paid = pay.cash + pay.card + pay.transfer + pay.account;
  const remaining = total - paid;
  const change = paid > total ? paid - total : 0;

  async function handleSkuSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sku = skuInput.trim();
    if (!sku) return;
    setSkuLoading(true);
    try {
      const product = await findProductBySku(sku);
      if (!product) {
        toast.error(`SKU "${sku}" no encontrado`);
        return;
      }
      const existing = cart.findIndex((l) => l.productId === product.id);
      if (existing >= 0) {
        setCart((prev) => prev.map((l, i) => i === existing ? { ...l, quantity: l.quantity + 1 } : l));
      } else {
        setCart((prev) => [
          ...prev,
          {
            productId: product.id,
            sku: product.sku ?? sku,
            name: product.name,
            unitPrice: Number(product.basePrice ?? 0),
            quantity: 1,
            discount: 0,
          },
        ]);
      }
      setSkuInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al buscar producto");
    } finally {
      setSkuLoading(false);
    }
  }

  function updateLine(index: number, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function clearAll() {
    setCart([]);
    setPay({ cash: 0, card: 0, transfer: 0, account: 0 });
    setGlobalDiscount(0);
    setCustomer(null);
    setSkuInput("");
  }

  function handleSubmit() {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    if (!warehouseId) {
      toast.error("Seleccione un depósito");
      return;
    }
    if (Math.abs(remaining) > 0.01) {
      toast.error(
        remaining > 0
          ? `Falta cobrar ${fmtAR(remaining)}`
          : `Pago excede el total por ${fmtAR(-remaining)} (efectivo aceptado para vuelto)`
      );
      // Allow submit if the only excess is in cash (vuelto). Block for other methods.
      const nonCashOver = (pay.card + pay.transfer + pay.account) - total > 0.01;
      const onlyCashOver = remaining < 0 && !nonCashOver;
      if (!onlyCashOver) return;
    }
    if (pay.account > 0 && !customer) {
      toast.error("El pago en cuenta corriente requiere seleccionar un cliente");
      return;
    }

    const payments: CreatePosSaleInput["payments"] = [];
    if (pay.cash > 0) payments.push({ method: "cash", amount: Math.min(pay.cash, total - (pay.card + pay.transfer + pay.account)) });
    if (pay.card > 0) payments.push({ method: "card", amount: pay.card });
    if (pay.transfer > 0) payments.push({ method: "transfer", amount: pay.transfer });
    if (pay.account > 0) payments.push({ method: "account", amount: pay.account });

    const items: CreatePosSaleInput["items"] = cart.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
    }));

    startSubmit(async () => {
      const result = await createPosSale({
        warehouseId,
        customerId: customer?.id ?? null,
        items,
        payments,
      });
      if (!result.ok) {
        toast.error(`${result.code}: ${result.message}`);
        return;
      }
      setTicket(result.result);
      toast.success("Venta registrada");
    });
  }

  function closeTicketAndReset() {
    setTicket(null);
    clearAll();
  }

  function printTicket() {
    if (typeof window !== "undefined") window.print();
  }

  const filteredCustomers = customers.slice(0, 50);

  return (
    <>
      {ticket && (
        <style>{`
          @page { size: A4; margin: 10mm; }
          @media print {
            html, body { background: #fff !important; }
            body * { visibility: hidden !important; }
            .pos-print-document, .pos-print-document * { visibility: visible !important; }
            .pos-print-document {
              display: block !important;
              position: fixed !important;
              inset: 0 auto auto 0 !important;
              width: 190mm !important;
              min-height: 277mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              color: #000 !important;
              box-shadow: none !important;
            }
          }
        `}</style>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 p-4 h-full overflow-hidden print:hidden">
      {/* ─── Left column: scanner + cart ──────────────────── */}
      <div className="flex flex-col gap-3 min-h-0">
        <div className="flex items-center gap-3">
          <ScanLine className="size-5 text-primary" />
          <h1 className="text-xl font-semibold">Mostrador</h1>
          <div className="ml-auto flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Depósito</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Depósito" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <form onSubmit={handleSkuSubmit} className="flex gap-2">
          <Input
            ref={skuRef}
            autoFocus
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            placeholder="Escanear o tipear SKU…"
            className="text-base font-mono"
            disabled={skuLoading}
          />
          <Button type="submit" disabled={skuLoading || !skuInput.trim()}>
            {skuLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            <span className="ml-1">Agregar</span>
          </Button>
        </form>

        <div className="flex-1 border rounded-md overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-2 w-28 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 w-24 text-right font-medium">P. Unit</th>
                <th className="px-3 py-2 w-20 text-center font-medium">Cant</th>
                <th className="px-3 py-2 w-20 text-center font-medium">% Desc</th>
                <th className="px-3 py-2 w-28 text-right font-medium">Subtotal</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-muted-foreground text-sm">
                    Carrito vacío. Escaneá un código o tipeá un SKU para empezar.
                  </td>
                </tr>
              )}
              {cart.map((l, i) => (
                <tr key={`${l.productId}-${i}`} className="border-t">
                  <td className="px-3 py-1.5 font-mono text-xs">{l.sku}</td>
                  <td className="px-3 py-1.5 truncate max-w-[20rem]" title={l.name}>{l.name}</td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={l.unitPrice}
                      onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) || 0 })}
                      className="h-7 text-right text-xs"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={l.quantity}
                      onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-7 text-center text-xs"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={l.discount}
                      onChange={(e) => updateLine(i, { discount: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                      className="h-7 text-center text-xs"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmtAR(lineSubtotal(l))}</td>
                  <td className="px-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => removeLine(i)}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{cart.length} artículo{cart.length === 1 ? "" : "s"} en carrito</span>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
              <X className="size-3 mr-1" /> Limpiar carrito
            </Button>
          )}
        </div>
      </div>

      {/* ─── Right column: customer + payments + total ─────── */}
      <div className="flex flex-col gap-3 min-h-0">
        <div className="border rounded-md p-3 space-y-2">
          <Label className="text-xs">Cliente</Label>
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between font-normal">
                <span className={cn(!customer && "text-muted-foreground")}>
                  {customer ? customer.label : "Consumidor Final"}
                </span>
                <Search className="size-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar cliente…" />
                <CommandList>
                  <CommandEmpty>Sin resultados</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="consumidor-final"
                      onSelect={() => { setCustomer(null); setCustomerOpen(false); }}
                    >
                      Consumidor Final
                    </CommandItem>
                    {filteredCustomers.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.label} ${c.id}`}
                        onSelect={() => { setCustomer(c); setCustomerOpen(false); }}
                      >
                        <span className="flex-1 truncate">{c.label}</span>
                        {c.creditLimit > 0 && (
                          <span className="ml-2 text-[10px] text-muted-foreground tabular-nums">
                            cta cte: {fmtAR(c.currentBalance)} / {fmtAR(c.creditLimit)}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="border rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{fmtAR(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm gap-2">
            <span className="text-muted-foreground">Descuento global %</span>
            <Input
              type="number"
              step="1"
              min="0"
              max="100"
              value={globalDiscount}
              onChange={(e) => setGlobalDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              className="h-7 w-20 text-right text-xs"
            />
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Descuento aplicado</span>
              <span className="tabular-nums">- {fmtAR(discountAmount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{fmtAR(total)}</span>
          </div>
        </div>

        <div className="border rounded-md p-3 space-y-2">
          <h3 className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Forma de pago</h3>
          <PayInput label="Efectivo" value={pay.cash} onChange={(v) => setPay({ ...pay, cash: v })} />
          <PayInput label="Tarjeta" value={pay.card} onChange={(v) => setPay({ ...pay, card: v })} />
          <PayInput label="Transferencia" value={pay.transfer} onChange={(v) => setPay({ ...pay, transfer: v })} />
          <PayInput
            label="Cuenta corriente"
            value={pay.account}
            disabled={!customer}
            onChange={(v) => setPay({ ...pay, account: v })}
            hint={!customer ? "(elija cliente)" : undefined}
          />
          <Separator />
          <div className={cn(
            "flex items-center justify-between text-sm",
            Math.abs(remaining) < 0.01 ? "text-emerald-600" : remaining > 0 ? "text-amber-600" : "text-blue-600"
          )}>
            <span>{remaining > 0 ? "Falta cobrar" : remaining < 0 ? "Vuelto" : "Cuenta saldada"}</span>
            <span className="tabular-nums font-semibold">
              {fmtAR(Math.abs(remaining < 0 ? change : remaining))}
            </span>
          </div>
        </div>

        <Button
          className="h-14 text-base"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || cart.length === 0}
        >
          {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Finalizar venta · {fmtAR(total)}
        </Button>
      </div>
      </div>

      {/* ─── Ticket modal ───────────────────────────────────── */}
      <Dialog open={!!ticket} onOpenChange={(o) => !o && closeTicketAndReset()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Venta registrada</DialogTitle>
          </DialogHeader>
          {ticket && <TicketBody result={ticket} customerLabel={customer?.label ?? "Consumidor Final"} cart={cart} change={change} />}
          <DialogFooter>
            <Button variant="outline" onClick={closeTicketAndReset}>Cerrar</Button>
            <Button onClick={printTicket}>
              <Printer className="size-4 mr-2" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Print-only remito/factura layout ──────────────── */}
      {ticket && (
        <PosSalePrintDocument
          result={ticket}
          customerLabel={customer?.label ?? "Consumidor Final"}
          lines={cart.map((line, index): PosSaleLine => ({
            id: `${line.productId}-${index}`,
            productId: line.productId,
            sku: line.sku,
            name: line.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount > 0 ? line.unitPrice * line.quantity * (line.discount / 100) : 0,
            tax: 0,
            subtotal: lineSubtotal(line),
          }))}
        />
      )}
    </>
  );
}

// ─── Small subcomponents ─────────────────────────────────
function PayInput({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs flex-1 flex items-center gap-1">
        {label}
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </Label>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-8 w-32 text-right text-sm"
        placeholder="0,00"
      />
    </div>
  );
}

function invoiceLabel(invoice: NonNullable<PosSaleResult["invoice"]>) {
  const type = invoice.type ?? invoice.invoiceType;
  const typeLabel = type ? `Factura ${type}` : "Factura";
  return invoice.number ? `${typeLabel} Nº ${invoice.number}` : `${typeLabel} sin número asignado`;
}

function TicketBody({
  result,
  customerLabel,
  cart,
  change,
}: {
  result: PosSaleResult;
  customerLabel: string;
  cart: CartLine[];
  change: number;
}) {
  return (
    <div className="text-sm space-y-1.5">
      <div className="text-xs text-muted-foreground">
        {new Date(result.sale.createdAt).toLocaleString("es-AR")} · #{result.sale.id.slice(-6).toUpperCase()}
      </div>
      <div className="text-xs">Cliente: <span className="font-medium">{customerLabel}</span></div>
      <Separator />
      <div className="max-h-48 overflow-auto">
        {cart.map((l, i) => (
          <div key={i} className="flex justify-between text-xs py-0.5">
            <span className="truncate flex-1">{l.quantity} × {l.name}</span>
            <span className="tabular-nums">{fmtAR(lineSubtotal(l))}</span>
          </div>
        ))}
      </div>
      <Separator />
      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{fmtAR(Number(result.sale.total))}</span>
      </div>
      {change > 0 && (
        <div className="flex justify-between text-xs text-emerald-600">
          <span>Vuelto</span>
          <span className="tabular-nums">{fmtAR(change)}</span>
        </div>
      )}
      {result.invoice && (
        <div className="mt-2 rounded-md border bg-muted/40 p-2 text-[11px]">
          <div className="font-medium text-foreground">
            Comprobante: {invoiceLabel(result.invoice)}
          </div>
          <div className="text-muted-foreground">
            Venta POS #{result.sale.id.slice(-6).toUpperCase()}{result.invoice.cae ? ` · CAE ${result.invoice.cae}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function PosPrintRemito({
  result,
  customerLabel,
  cart,
  subtotal,
  discountAmount,
  total,
  payments,
  change,
}: {
  result: PosSaleResult;
  customerLabel: string;
  cart: CartLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
  payments: { cash: number; card: number; transfer: number; account: number };
  change: number;
}) {
  const saleNumber = result.sale.id.slice(-6).toUpperCase();
  const displayInvoiceLabel = result.invoice
    ? invoiceLabel(result.invoice).replace(" sin número asignado", "")
    : "Remito interno";

  return (
    <section className="pos-print-document hidden print:block bg-white text-black font-sans text-[11px] leading-tight">
      <div className="mx-auto w-[190mm] p-2">
        <header className="grid grid-cols-[1fr_26mm_1fr] border border-black">
          <div className="p-3">
            <h2 className="text-[16px] font-bold uppercase tracking-wide">Ferretería del Norte</h2>
            <p className="mt-1 text-[10px]">ERP · Mostrador / POS</p>
            <p className="text-[10px]">Condición IVA: Responsable Inscripto</p>
          </div>
          <div className="flex items-start justify-center border-x border-black pt-2">
            <div className="flex h-10 w-10 items-center justify-center border border-black text-xl font-bold">X</div>
          </div>
          <div className="p-3 text-right">
            <p className="text-[15px] font-bold uppercase">Remito</p>
            <p className="text-[10px]">{displayInvoiceLabel}</p>
            <p className="mt-2 font-semibold">Venta Nº {saleNumber}</p>
            <p>{new Date(result.sale.createdAt).toLocaleString("es-AR")}</p>
          </div>
        </header>

        <section className="mt-2 grid grid-cols-2 gap-2 border border-black p-2">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-gray-600">Cliente</p>
            <p className="font-semibold">{customerLabel}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-gray-600">Operación</p>
            <p>Venta de mostrador · Entrega inmediata</p>
          </div>
        </section>

        <table className="mt-2 w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-1 py-1 text-left font-semibold">Código</th>
              <th className="border border-black px-1 py-1 text-left font-semibold">Descripción</th>
              <th className="border border-black px-1 py-1 text-right font-semibold">Cant.</th>
              <th className="border border-black px-1 py-1 text-right font-semibold">P. Unit.</th>
              <th className="border border-black px-1 py-1 text-right font-semibold">Desc.</th>
              <th className="border border-black px-1 py-1 text-right font-semibold">Importe</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((line, index) => (
              <tr key={`${line.productId}-${index}`}>
                <td className="border border-black px-1 py-1 font-mono">{line.sku}</td>
                <td className="border border-black px-1 py-1">{line.name}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{line.quantity}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmtAR(line.unitPrice)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{line.discount ? `${line.discount}%` : "—"}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmtAR(lineSubtotal(line))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-2 grid grid-cols-[1fr_58mm] gap-3">
          <div className="border border-black p-2 text-[10px]">
            <p className="font-semibold uppercase">Forma de pago</p>
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
              {payments.cash > 0 && <PaymentRow label="Efectivo" value={payments.cash} />}
              {payments.card > 0 && <PaymentRow label="Tarjeta" value={payments.card} />}
              {payments.transfer > 0 && <PaymentRow label="Transferencia" value={payments.transfer} />}
              {payments.account > 0 && <PaymentRow label="Cuenta corriente" value={payments.account} />}
              {change > 0 && <PaymentRow label="Vuelto" value={change} />}
            </div>
            {result.invoice?.cae && (
              <p className="mt-2 text-[9px]">CAE: {result.invoice.cae}</p>
            )}
          </div>

          <div className="border border-black text-[10px]">
            <SummaryRow label="Subtotal" value={subtotal} />
            {discountAmount > 0 && <SummaryRow label="Descuento" value={-discountAmount} />}
            <div className="flex justify-between border-t border-black px-2 py-1.5 text-[13px] font-bold">
              <span>Total</span>
              <span className="tabular-nums">{fmtAR(total)}</span>
            </div>
          </div>
        </section>

        <footer className="mt-8 grid grid-cols-2 gap-8 text-[10px]">
          <div className="border-t border-black pt-1 text-center">Firma / aclaración cliente</div>
          <div className="border-t border-black pt-1 text-center">Entregado por</div>
        </footer>
      </div>
    </section>
  );
}

function PaymentRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="tabular-nums">{fmtAR(value)}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between px-2 py-1">
      <span>{label}</span>
      <span className="tabular-nums">{fmtAR(value)}</span>
    </div>
  );
}
