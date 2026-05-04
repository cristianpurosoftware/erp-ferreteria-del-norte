import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { getInvoiceById } from "@/lib/actions/invoices";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/types";
import { INVOICE_TYPE_LABELS } from "@/lib/types";
import { RequestCaeButton } from "@/components/invoices/request-cae-button";
import { PrintInvoiceButton } from "@/components/invoices/print-invoice-button";

const statusConfig: Record<InvoiceStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: "Borrador", color: "text-gray-500", bgColor: "bg-gray-500/10" },
  pending_issue: { label: "Pendiente emisión", color: "text-yellow-600", bgColor: "bg-yellow-500/10" },
  issued: { label: "Emitido", color: "text-p3", bgColor: "bg-p3/10" },
  cancelled: { label: "Cancelado", color: "text-red-500", bgColor: "bg-red-500/10" },
  voided: { label: "Anulado", color: "text-red-400", bgColor: "bg-red-400/10" },
};

const fiscalStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  submitted: "Enviado",
  accepted: "Aceptado",
  rejected: "Rechazado",
  error: "Error",
  not_required: "No requerido",
};

function formatOrderNumber(num: number | null | undefined, id: string | null): string {
  if (!id) return "—";
  if (num && num > 0) return String(num);
  return id.slice(0, 8);
}

export default async function ComprobanteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let invoice;
  try {
    invoice = await getInvoiceById(id);
  } catch {
    notFound();
  }
  if (!invoice) notFound();

  const st = statusConfig[invoice.status];

  return (
    <div className="w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 h-full">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href="/comprobantes"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="size-5 text-p3" />
                Comprobante {invoice.number ? `Nº ${invoice.number}` : invoice.id.slice(0, 8)}
              </h1>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", st.bgColor, st.color)}>
                {st.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {invoice.issueDate ? formatDate(invoice.issueDate) : "Sin fecha de emisión"}
            </p>
          </div>
          <PrintInvoiceButton />
          {invoice.status === "pending_issue" && !invoice.cae && (
            <RequestCaeButton invoiceId={invoice.id} />
          )}
        </div>

        {/* Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-medium">Datos del comprobante</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número</span>
                <span className="font-mono">{invoice.number ?? "Sin asignar"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <Link href={`/clientes/${invoice.customerId}`} className="hover:underline font-medium">
                  {invoice.customerName ?? "Cliente eliminado"}
                </Link>
              </div>
              {invoice.orderId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pedido</span>
                  <Link href={`/pedidos/${invoice.orderId}`} className="hover:underline font-medium">
                    {formatOrderNumber(invoice.orderNumber, invoice.orderId)}
                  </Link>
                </div>
              )}
              {invoice.fiscalIntegrationStatus && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Integración fiscal</span>
                  <span>{fiscalStatusLabels[invoice.fiscalIntegrationStatus] ?? invoice.fiscalIntegrationStatus}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-medium">Montos</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatMoney(invoice.subtotal)}</span>
              </div>
              {invoice.taxes > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impuestos</span>
                  <span className="tabular-nums">{formatMoney(invoice.taxes)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fiscal (Fase 5) */}
        {(invoice.cae || invoice.invoiceType || invoice.salesPoint) && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              Fiscal
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Tipo</p>
                <p className="mt-1 font-medium">
                  {invoice.invoiceType ? INVOICE_TYPE_LABELS[invoice.invoiceType] ?? invoice.invoiceType : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Punto de venta</p>
                <p className="mt-1 font-medium font-mono">{invoice.salesPoint ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">CAE</p>
                <p className="mt-1 font-medium font-mono">{invoice.cae ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Vto. CAE</p>
                <p className="mt-1 font-medium">
                  {invoice.caeExpiration?.slice(0, 10) ?? "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-2">Notas</h3>
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
