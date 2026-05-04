"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, Loader2, Printer, Receipt, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PosSalePrintDocument } from "@/components/pos/pos-sale-print-document";
import { getPosSaleById } from "@/lib/actions/pos";
import type { PosSaleListItem, PosSaleResult } from "@/lib/api/endpoints/pos";
import { toast } from "sonner";

const fmtAR = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n ?? 0));

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function invoiceLabel(sale: PosSaleListItem) {
  if (!sale.invoiceId) return "Remito interno";
  const type = sale.invoiceType ? `Factura ${sale.invoiceType}` : "Factura";
  return sale.invoiceNumber ? `${type} Nº ${sale.invoiceNumber}` : `${type} sin N°`;
}

function selectedInvoiceLabel(invoice: NonNullable<PosSaleResult["invoice"]>) {
  const type = invoice.type ?? invoice.invoiceType;
  const typeLabel = type ? `Factura ${type}` : "Factura";
  return invoice.number ? `${typeLabel} Nº ${invoice.number}` : `${typeLabel} sin N°`;
}

export function PosSalesClient({ initialSales }: { initialSales: PosSaleListItem[] }) {
  const [sales, setSales] = React.useState(initialSales);
  const [selected, setSelected] = React.useState<PosSaleResult | null>(null);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  React.useEffect(() => setSales(initialSales), [initialSales]);

  async function openSale(id: string, shouldPrint = false) {
    setLoadingId(id);
    try {
      const result = await getPosSaleById(id);
      setSelected(result);
      if (shouldPrint) setTimeout(() => window.print(), 120);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo abrir la venta POS");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      {selected && (
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

      <div className="w-full overflow-y-auto p-4 sm:p-6 h-full print:hidden">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Receipt className="size-5 text-primary" /> Ventas POS
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Historial de ventas de mostrador con acceso al comprobante y reimpresión para el demo comercial.
              </p>
            </div>
            <Button asChild>
              <Link href="/pos">Nueva venta en mostrador</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase">Ventas listadas</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{sales.length}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase">Total vendido</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{fmtAR(sales.reduce((acc, sale) => acc + Number(sale.total ?? 0), 0))}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase">Última venta</p>
              <p className="mt-1 text-sm font-medium">{sales[0] ? formatDateTime(sales[0].createdAt) : "Sin ventas"}</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Venta</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Comprobante</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Todavía no hay ventas POS registradas.
                    </td>
                  </tr>
                )}
                {sales.map((sale) => {
                  const saleNumber = sale.id.slice(-6).toUpperCase();
                  const busy = loadingId === sale.id;
                  return (
                    <tr key={sale.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-mono font-medium">#{saleNumber}</div>
                        <div className="text-xs text-muted-foreground">Pedido {sale.orderNumber ? `Nº ${sale.orderNumber}` : sale.orderId.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(sale.createdAt)}</td>
                      <td className="px-4 py-3">{sale.customerName ?? "Consumidor Final"}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{invoiceLabel(sale)}</div>
                        {sale.cae ? <div className="text-xs text-muted-foreground font-mono">CAE {sale.cae}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmtAR(sale.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" disabled={busy} onClick={() => openSale(sale.id)}>
                            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
                            <span className="ml-1">Ver</span>
                          </Button>
                          <Button size="sm" disabled={busy} onClick={() => openSale(sale.id, true)}>
                            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
                            <span className="ml-1">Reimprimir</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg print:hidden">
          <DialogHeader>
            <DialogTitle>Comprobante de venta POS</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Venta POS</span>
                  <span className="font-mono">#{selected.sale.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comprobante</span>
                  <span className="font-medium">
                    {selected.invoice ? selectedInvoiceLabel(selected.invoice) : "Remito interno"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span>{selected.order?.customerName ?? "Consumidor Final"}</span>
                </div>
              </div>
              <div className="max-h-56 overflow-auto space-y-1">
                {(selected.items ?? []).map((line) => (
                  <div key={line.id} className="flex justify-between gap-3 text-xs">
                    <span className="truncate">{line.quantity} × {line.name}</span>
                    <span className="tabular-nums">{fmtAR(line.subtotal)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{fmtAR(selected.sale.total)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cerrar</Button>
            <Button onClick={() => window.print()}>
              <RotateCcw className="size-4 mr-2" /> Reimprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selected && <PosSalePrintDocument result={selected} />}
    </>
  );
}
