"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, FileText, Send, Check, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupplierInvoiceById, submitSupplierInvoice, approveSupplierInvoice, disputeSupplierInvoice, cancelSupplierInvoice } from "@/lib/actions/supplier-invoices";
import type { SupplierInvoice } from "@/lib/types";
import { SUPPLIER_INVOICE_STATUS_LABELS, INVOICE_TYPE_LABELS } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export default function FacturaProveedorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<SupplierInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const id = params.id;
  const refetch = useCallback(async () => setInvoice(await getSupplierInvoiceById(id)), [id]);
  useEffect(() => { refetch().finally(() => setLoading(false)); }, [refetch]);

  const act = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setActing(key);
    try { await fn(); toast.success(msg); await refetch(); router.refresh(); }
    catch (err) { toast.error("Error", { description: err instanceof Error ? err.message : "" }); }
    finally { setActing(null); }
  };

  if (loading || !invoice) return <div className="p-6"><Skeleton className="h-48 w-full" /></div>;
  const items = invoice.items ?? [];

  return (
    <div className="w-full overflow-y-auto p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <Link href="/compras/facturas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Volver</Link>
          <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2"><FileText className="size-6 text-p3" />{invoice.supplierInvoiceNumber}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{invoice.supplierName ?? "—"} · {INVOICE_TYPE_LABELS[invoice.invoiceType]}</p>
            </div>
            <Badge>{SUPPLIER_INVOICE_STATUS_LABELS[invoice.status]}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === "draft" && <Button size="sm" disabled={!!acting} onClick={() => act("submit", () => submitSupplierInvoice(id), "Enviada a aprobación")}><Send className="size-3.5 mr-1" />Enviar</Button>}
          {invoice.status === "pending_approval" && <Button size="sm" disabled={!!acting} onClick={() => act("approve", () => approveSupplierInvoice(id), "Aprobada")}><Check className="size-3.5 mr-1" />Aprobar</Button>}
          {(invoice.status === "pending_approval" || invoice.status === "matched") && (
            <Button size="sm" variant="outline" disabled={!!acting} onClick={() => act("dispute", () => disputeSupplierInvoice(id, "Discrepancia detectada"), "En disputa")}>
              <AlertTriangle className="size-3.5 mr-1" />Disputar
            </Button>
          )}
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Button size="sm" variant="outline" className="text-destructive" disabled={!!acting} onClick={() => act("cancel", () => cancelSupplierInvoice(id), "Cancelada")}>
              <XCircle className="size-3.5 mr-1" />Cancelar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground uppercase">Emisión</p><p className="text-sm font-medium mt-1">{invoice.issueDate.slice(0, 10)}</p></div>
          <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground uppercase">Vencimiento</p><p className="text-sm font-medium mt-1">{invoice.dueDate?.slice(0, 10) ?? "—"}</p></div>
          <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground uppercase">CAE</p><p className="text-sm font-medium mt-1 font-mono">{invoice.cae ?? "—"}</p></div>
          <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground uppercase">Total</p><p className="text-lg font-semibold mt-1 tabular-nums">{formatMoney(Number(invoice.total))}</p></div>
        </div>

        <section>
          <h2 className="text-sm font-semibold mb-2">Ítems ({items.length})</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <TableHead>Descripción</TableHead><TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo</TableHead><TableHead className="text-right">Subtotal</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin ítems.</TableCell></TableRow>
                ) : items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm">{it.productName ?? it.description}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{it.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatMoney(Number(it.unitCost))}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">{formatMoney(Number(it.subtotal))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <div className="text-right space-y-1 text-sm">
          <div className="flex justify-end gap-6"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatMoney(Number(invoice.subtotal))}</span></div>
          <div className="flex justify-end gap-6"><span className="text-muted-foreground">Impuestos</span><span className="tabular-nums">{formatMoney(Number(invoice.taxes))}</span></div>
          {invoice.perceptions > 0 && <div className="flex justify-end gap-6"><span className="text-muted-foreground">Percepciones</span><span className="tabular-nums">{formatMoney(Number(invoice.perceptions))}</span></div>}
          <div className="flex justify-end gap-6 font-semibold"><span>Total</span><span className="tabular-nums">{formatMoney(Number(invoice.total))}</span></div>
        </div>
      </div>
    </div>
  );
}
