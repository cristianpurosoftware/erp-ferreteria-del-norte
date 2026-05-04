import type { PosPaymentInput, PosSaleLine, PosSaleResult } from "@/lib/api/endpoints/pos";

const fmtAR = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n ?? 0));

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

function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    account: "Cuenta corriente",
  };
  return labels[method] ?? method;
}

interface PosSalePrintDocumentProps {
  result: PosSaleResult;
  customerLabel?: string;
  lines?: PosSaleLine[];
  className?: string;
}

export function PosSalePrintDocument({ result, customerLabel, lines, className }: PosSalePrintDocumentProps) {
  const saleNumber = result.sale.id.slice(-6).toUpperCase();
  const displayCustomer = customerLabel ?? result.order?.customerName ?? "Consumidor Final";
  const invoiceLabel = result.invoice
    ? `Factura ${result.invoice.type}${result.invoice.number ? ` Nº ${result.invoice.number}` : ""}`
    : "Remito interno";
  const invoiceNumber = result.invoice?.number ?? "Sin asignar";
  const printableLines = lines ?? result.items ?? [];
  const subtotal = Number(result.sale.subtotal ?? result.order?.subtotal ?? 0);
  const discountAmount = Number(result.sale.discount ?? result.order?.discounts ?? 0);
  const taxes = Number(result.sale.taxes ?? result.order?.taxes ?? 0);
  const total = Number(result.sale.total ?? result.order?.total ?? 0);
  const payments: PosPaymentInput[] = result.sale.paymentBreakdown ?? [];

  return (
    <section className={`pos-print-document hidden print:block bg-white text-black font-sans text-[11px] leading-tight ${className ?? ""}`}>
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
            <p className="text-[15px] font-bold uppercase">Remito / Comprobante</p>
            <p className="text-[10px]">{invoiceLabel}</p>
            <p className="mt-2 font-semibold">Comprobante Nº {invoiceNumber}</p>
            <p className="font-semibold">Venta POS Nº {saleNumber}</p>
            <p>{new Date(result.sale.createdAt).toLocaleString("es-AR")}</p>
          </div>
        </header>

        <section className="mt-2 grid grid-cols-2 gap-2 border border-black p-2">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-gray-600">Cliente</p>
            <p className="font-semibold">{displayCustomer}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-gray-600">Operación</p>
            <p>Venta de mostrador · Entrega inmediata</p>
            {result.order?.number ? <p>Pedido Nº {result.order.number}</p> : null}
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
            {printableLines.map((line, index) => (
              <tr key={`${line.productId}-${index}`}>
                <td className="border border-black px-1 py-1 font-mono">{line.sku || "—"}</td>
                <td className="border border-black px-1 py-1">{line.name}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{line.quantity}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmtAR(line.unitPrice)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{line.discount ? fmtAR(line.discount) : "—"}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmtAR(line.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-2 grid grid-cols-[1fr_58mm] gap-3">
          <div className="border border-black p-2 text-[10px]">
            <p className="font-semibold uppercase">Forma de pago</p>
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
              {payments.map((payment, index) => (
                <PaymentRow key={`${payment.method}-${index}`} label={paymentLabel(payment.method)} value={payment.amount} />
              ))}
            </div>
            {result.invoice?.cae && <p className="mt-2 text-[9px]">CAE: {result.invoice.cae}</p>}
          </div>

          <div className="border border-black text-[10px]">
            <SummaryRow label="Subtotal" value={subtotal} />
            {discountAmount > 0 && <SummaryRow label="Descuento" value={-discountAmount} />}
            {taxes > 0 && <SummaryRow label="Impuestos" value={taxes} />}
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
