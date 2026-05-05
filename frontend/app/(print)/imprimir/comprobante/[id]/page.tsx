import { getInvoiceById } from "@/lib/actions/invoices";
import { formatDate, formatMoney } from "@/lib/format";
import { INVOICE_TYPE_LABELS, type InvoiceStatus } from "@/lib/types";
import { PrintControls } from "./print-controls";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  pending_issue: "Pendiente de emisión",
  issued: "Emitido",
  cancelled: "Cancelado",
  voided: "Anulado",
};

const fiscalStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  submitted: "Enviado",
  accepted: "Aceptado",
  rejected: "Rechazado",
  error: "Error",
  not_required: "No requerido",
};

function displayInvoiceNumber(invoice: Awaited<ReturnType<typeof getInvoiceById>>) {
  return invoice.number ?? `${invoice.invoiceType ?? "B"}-${invoice.salesPoint ?? "0001"}-Sin asignar`;
}

function formatOrderNumber(num: number | null | undefined, id: string | null): string {
  if (!id) return "—";
  if (num && num > 0) return String(num);
  return id.slice(0, 8);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="min-w-[100px] shrink-0 text-[10px] uppercase tracking-wide text-black/55">
        {label}
      </span>
      <span className="font-medium text-[11px]">{value || <span className="text-black/35">—</span>}</span>
    </div>
  );
}

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let invoice: Awaited<ReturnType<typeof getInvoiceById>>;

  try {
    invoice = await getInvoiceById(id);
  } catch {
    return (
      <div className="mx-auto max-w-xl p-10 text-sm">
        <p className="text-red-700">No se pudo cargar el comprobante.</p>
      </div>
    );
  }

  const invoiceType = invoice.invoiceType
    ? INVOICE_TYPE_LABELS[invoice.invoiceType] ?? `Factura ${invoice.invoiceType}`
    : "Factura";
  const invoiceNumber = displayInvoiceNumber(invoice);
  const issuedAt = invoice.issueDate ? formatDate(invoice.issueDate) : formatDate(invoice.createdAt);
  const fiscalStatus = invoice.fiscalIntegrationStatus
    ? fiscalStatusLabels[invoice.fiscalIntegrationStatus] ?? invoice.fiscalIntegrationStatus
    : "No requerido";

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
        .print-document { font-family: ui-sans-serif, system-ui, sans-serif; }
        .print-document table { border-collapse: collapse; width: 100%; }
        .print-document th, .print-document td {
          border: 0.5pt solid rgba(0,0,0,0.35);
          padding: 5px 6px;
          font-size: 10px;
          vertical-align: top;
        }
        .print-document th { background: #f3f4f6; font-weight: 600; text-align: left; }
        .manual-line { border-bottom: 0.5pt solid rgba(0,0,0,0.35); min-height: 18px; }
      `}</style>

      <PrintControls />

      <main className="print-document mx-auto max-w-[200mm] p-6 text-black">
        <header className="mb-5 border-b-2 border-black pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-black/55">
                Ferretería del Norte
              </p>
              <h1 className="mt-1 text-xl font-bold leading-tight">{invoiceType}</h1>
              <p className="mt-1 text-[11px] text-black/65">
                Comprobante interno del ERP · Emitido: {new Date().toLocaleString("es-AR")}
              </p>
            </div>
            <div className="min-w-[78mm] rounded border-2 border-black p-3 text-right">
              <p className="text-[10px] uppercase tracking-wide text-black/55">Comprobante Nº</p>
              <p className="mt-1 font-mono text-lg font-bold">{invoiceNumber}</p>
              <p className="mt-1 text-[11px]">Estado: <span className="font-semibold">{STATUS_LABEL[invoice.status]}</span></p>
            </div>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded border border-black/25 p-3">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide">Datos del cliente</h2>
            <Row label="Cliente" value={invoice.customerName ?? "Cliente eliminado"} />
            <Row label="ID cliente" value={<span className="font-mono">{invoice.customerId}</span>} />
          </div>

          <div className="rounded border border-black/25 p-3">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide">Datos del comprobante</h2>
            <Row label="Fecha" value={issuedAt} />
            <Row label="Pedido" value={formatOrderNumber(invoice.orderNumber, invoice.orderId)} />
            <Row label="Punto venta" value={<span className="font-mono">{invoice.salesPoint ?? "0001"}</span>} />
          </div>
        </section>

        <section className="mb-4">
          <h2 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide">Resumen facturado</h2>
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th style={{ width: "34mm" }} className="text-right">Subtotal</th>
                <th style={{ width: "34mm" }} className="text-right">Impuestos</th>
                <th style={{ width: "34mm" }} className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="font-medium">Venta de mercadería</div>
                  <div className="text-[9px] text-black/55">
                    {invoice.orderId ? `Pedido ${formatOrderNumber(invoice.orderNumber, invoice.orderId)}` : "Comprobante manual"}
                  </div>
                </td>
                <td className="text-right tabular-nums">{formatMoney(invoice.subtotal)}</td>
                <td className="text-right tabular-nums">{formatMoney(invoice.taxes)}</td>
                <td className="text-right font-semibold tabular-nums">{formatMoney(invoice.total)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded border border-black/25 p-3 text-[11px]">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide">Fiscal</h2>
            <Row label="Tipo" value={invoice.invoiceType ?? "B"} />
            <Row label="CAE" value={<span className="font-mono">{invoice.cae ?? "—"}</span>} />
            <Row label="Vto. CAE" value={invoice.caeExpiration?.slice(0, 10) ?? "—"} />
            <Row label="Integración" value={fiscalStatus} />
          </div>

          <div className="rounded border border-black/25 p-3">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide">Totales</h2>
            <div className="space-y-1 text-[12px]">
              <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatMoney(invoice.subtotal)}</span></div>
              <div className="flex justify-between"><span>Impuestos</span><span className="tabular-nums">{formatMoney(invoice.taxes)}</span></div>
              <div className="mt-2 flex justify-between border-t border-black/25 pt-2 text-base font-bold">
                <span>Total</span><span className="tabular-nums">{formatMoney(invoice.total)}</span>
              </div>
            </div>
          </div>
        </section>

        {invoice.notes && (
          <section className="mb-4 rounded border border-black/25 p-3">
            <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wide">Observaciones</h2>
            <p className="whitespace-pre-wrap text-[11px]">{invoice.notes}</p>
          </section>
        )}

        <footer className="mt-8 grid grid-cols-2 gap-10 text-center text-[10px] text-black/60">
          <div><div className="manual-line" /><p className="mt-1">Recibí conforme</p></div>
          <div><div className="manual-line" /><p className="mt-1">Aclaración / firma</p></div>
        </footer>
      </main>
    </>
  );
}
