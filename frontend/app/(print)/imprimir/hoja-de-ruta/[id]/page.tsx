import { getDispatchSheetPrintData } from "@/lib/actions/dispatch-sheets";
import type { DispatchSheetPrintData } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { PrintControls } from "./print-controls";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  printed: "Impresa",
  dispatched: "Despachada",
  closed: "Cerrada",
};

type Stop = DispatchSheetPrintData["shipments"][number]["stops"][number];

function customerName(c: Stop["customer"]): string {
  if (!c) return "—";
  return c.commercialName ?? c.legalName;
}

function addressLine(a: Stop["address"]): string {
  if (!a) return "—";
  const bits = [a.street, a.city, a.province, a.postalCode].filter(Boolean);
  return bits.join(", ");
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="min-w-[95px] shrink-0 text-[10px] uppercase tracking-wide text-black/55">
        {label}
      </span>
      <span className="font-medium text-[11px]">{value || <span className="text-black/35">—</span>}</span>
    </div>
  );
}

export default async function PrintDispatchSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data: DispatchSheetPrintData;
  try {
    data = await getDispatchSheetPrintData(id);
  } catch {
    return (
      <div className="mx-auto max-w-xl p-10 text-sm">
        <p className="text-red-700">No se pudo cargar la hoja de ruta.</p>
      </div>
    );
  }

  const { sheet, shipments, totals } = data;
  const multipleShipments = shipments.length > 1;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .page-break { break-after: page; }
        }
        .print-document { font-family: ui-sans-serif, system-ui, sans-serif; }
        .print-document table { border-collapse: collapse; width: 100%; }
        .print-document th, .print-document td {
          border: 0.5pt solid rgba(0,0,0,0.35);
          padding: 3px 5px;
          font-size: 10px;
          vertical-align: top;
        }
        .print-document th { background: #f3f4f6; font-weight: 600; text-align: left; }
        .manual-line { border-bottom: 0.5pt solid rgba(0,0,0,0.35); min-height: 14px; }
        .check-box { width: 10px; height: 10px; border: 0.5pt solid #000; display: inline-block; }
      `}</style>

      <PrintControls />

      <div className="print-document mx-auto max-w-[200mm] p-6 text-black">
        {/* Header */}
        <header className="mb-4 border-b-2 border-black pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold leading-tight">
                Hoja de ruta Nº {sheet.number}
              </h1>
              <p className="text-[11px] text-black/65 mt-0.5">
                Fecha: <span className="font-medium text-black">{formatShortDate(sheet.date)}</span>
                {"  "}·{"  "}
                Estado: <span className="font-medium text-black">{STATUS_LABEL[sheet.status] ?? sheet.status}</span>
              </p>
            </div>
            <div className="text-right text-[10px] text-black/55">
              Emitido: {new Date().toLocaleString("es-AR")}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
            <div className="rounded border border-black/25 p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-black/60 mb-1">Depósito</p>
              <Row label="Nombre" value={sheet.warehouse?.name} />
              <Row label="Sucursal" value={sheet.warehouse?.branchId ? sheet.warehouse.branchId.slice(0, 8) : ""} />
            </div>
            <div className="rounded border border-black/25 p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-black/60 mb-1">Vehículo</p>
              <Row label="Patente" value={sheet.vehicle?.plate} />
              <Row label="Modelo" value={sheet.vehicle?.model} />
              <Row
                label="Capacidad"
                value={
                  sheet.vehicle?.capacityKg
                    ? `${sheet.vehicle.capacityKg} kg${sheet.vehicle.capacityM3 ? ` · ${sheet.vehicle.capacityM3} m³` : ""}`
                    : ""
                }
              />
            </div>
            <div className="rounded border border-black/25 p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-black/60 mb-1">Chofer</p>
              <Row label="Nombre" value={sheet.driver?.fullName} />
              <Row label="DNI" value={sheet.driver?.dni} />
              <Row label="Teléfono" value={sheet.driver?.phone} />
            </div>
          </div>

          {sheet.notes && (
            <div className="mt-2 rounded border border-black/25 p-2 text-[11px]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-black/60 mb-1">Observaciones</p>
              <p className="whitespace-pre-wrap">{sheet.notes}</p>
            </div>
          )}
        </header>

        {/* Listado de paradas */}
        <section className="mb-5">
          <h2 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide">
            Paradas {multipleShipments ? `(${shipments.length} envíos)` : ""}
          </h2>

          {shipments.length === 0 ? (
            <p className="text-[11px] text-black/55">Esta hoja no tiene envíos asociados.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: "22px" }}>#</th>
                  {multipleShipments && <th style={{ width: "40px" }}>Envío</th>}
                  <th>Cliente / Domicilio</th>
                  <th style={{ width: "70px" }}>Teléfono</th>
                  <th style={{ width: "55px" }}>Ventana</th>
                  <th style={{ width: "55px" }}>Pedido</th>
                  <th style={{ width: "75px" }}>Remito</th>
                  <th style={{ width: "70px" }} className="text-right">Importe doc.</th>
                  <th style={{ width: "40px" }} className="text-center">Bultos</th>
                  <th style={{ width: "40px" }} className="text-center">Pallets</th>
                  <th>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {shipments.flatMap((sh, shIdx) =>
                  sh.stops.length > 0
                    ? sh.stops.map((st, stIdx) => {
                        const rowNumber = shipments
                          .slice(0, shIdx)
                          .reduce((acc, s) => acc + s.stops.length, 0) + stIdx + 1;
                        return (
                          <tr key={st.id}>
                            <td className="text-center tabular-nums">{rowNumber}</td>
                            {multipleShipments && (
                              <td className="text-center tabular-nums">{sh.number}</td>
                            )}
                            <td>
                              <div className="font-medium">{customerName(st.customer)}</div>
                              <div className="text-[9px] text-black/60">{addressLine(st.address)}</div>
                            </td>
                            <td>{st.customer?.phone ?? ""}</td>
                            <td>{st.plannedWindow ?? ""}</td>
                            <td className="tabular-nums">{st.order ? `#${st.order.number}` : ""}</td>
                            <td className="tabular-nums">
                              {st.deliveryNote
                                ? `${st.deliveryNote.salesPoint ?? ""}${st.deliveryNote.salesPoint ? "-" : ""}${st.deliveryNote.number}`
                                : ""}
                            </td>
                            <td className="text-right tabular-nums">
                              {st.order ? formatMoney(Number(st.order.total)) : ""}
                            </td>
                            <td><div className="manual-line" /></td>
                            <td><div className="manual-line" /></td>
                            <td>
                              <div className="text-[9px]">{st.notes ?? ""}</div>
                            </td>
                          </tr>
                        );
                      })
                    : [
                        <tr key={`empty-${sh.id}`}>
                          <td colSpan={multipleShipments ? 11 : 10} className="text-center text-black/50">
                            Envío #{sh.number} sin paradas
                          </td>
                        </tr>,
                      ],
                )}
              </tbody>
            </table>
          )}
        </section>

        {/* Resumen de carga */}
        <section className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded border border-black/25 p-2.5">
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide">Resumen de carga</h3>
            <div className="grid grid-cols-2 gap-y-1 text-[11px]">
              <span className="text-black/60">Paradas</span>
              <span className="text-right font-medium tabular-nums">{totals.stops}</span>
              <span className="text-black/60">Pedidos</span>
              <span className="text-right font-medium tabular-nums">{totals.orders}</span>
              <span className="text-black/60">Peso total (kg)</span>
              <span className="text-right font-medium tabular-nums">
                {totals.totalWeightKg > 0 ? totals.totalWeightKg.toFixed(2) : "—"}
              </span>
              <span className="text-black/60">Importe documentado</span>
              <span className="text-right font-medium tabular-nums">{formatMoney(totals.documentedTotal)}</span>
              <span className="text-black/60">Bultos totales</span>
              <div className="manual-line" />
              <span className="text-black/60">Valores a bordo</span>
              <div className="manual-line" />
            </div>
          </div>

          <div className="rounded border border-black/25 p-2.5">
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide">Documentación entregada</h3>
            <ul className="space-y-1 text-[11px]">
              <li className="flex items-center gap-2"><span className="check-box" /> Facturas / Remitos</li>
              <li className="flex items-center gap-2"><span className="check-box" /> Remitos de devolución</li>
              <li className="flex items-center gap-2"><span className="check-box" /> Recibos</li>
              <li className="flex items-center gap-2"><span className="check-box" /> Retenciones</li>
              <li className="flex items-center gap-2"><span className="check-box" /> Otros: <span className="flex-1"><div className="manual-line" /></span></li>
            </ul>
          </div>
        </section>

        {/* Rendición por parada */}
        <section className="mb-5">
          <h2 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide">Rendición</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: "22px" }}>#</th>
                <th>Cliente</th>
                <th style={{ width: "28px" }} className="text-center">Entr.</th>
                <th style={{ width: "28px" }} className="text-center">Parc.</th>
                <th style={{ width: "28px" }} className="text-center">Rech.</th>
                <th style={{ width: "28px" }} className="text-center">N/V</th>
                <th>Motivo / bultos devueltos</th>
                <th style={{ width: "65px" }} className="text-right">Cobrado</th>
                <th style={{ width: "55px" }}>Medio</th>
                <th style={{ width: "40px" }}>Hora</th>
                <th style={{ width: "60px" }}>Firma</th>
              </tr>
            </thead>
            <tbody>
              {shipments.flatMap((sh, shIdx) =>
                sh.stops.map((st, stIdx) => {
                  const rowNumber = shipments
                    .slice(0, shIdx)
                    .reduce((acc, s) => acc + s.stops.length, 0) + stIdx + 1;
                  return (
                    <tr key={`r-${st.id}`} style={{ height: "26px" }}>
                      <td className="text-center tabular-nums">{rowNumber}</td>
                      <td>{customerName(st.customer)}</td>
                      <td className="text-center"><span className="check-box" /></td>
                      <td className="text-center"><span className="check-box" /></td>
                      <td className="text-center"><span className="check-box" /></td>
                      <td className="text-center"><span className="check-box" /></td>
                      <td><div className="manual-line" /></td>
                      <td><div className="manual-line" /></td>
                      <td><div className="manual-line" /></td>
                      <td><div className="manual-line" /></td>
                      <td><div className="manual-line" /></td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </section>

        {/* Totales de rendición */}
        <section className="mb-8 grid grid-cols-2 gap-3">
          <div className="rounded border border-black/25 p-2.5">
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide">Totales de rendición</h3>
            <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
              <span className="text-black/60">Efectivo</span>
              <div className="manual-line" />
              <span className="text-black/60">Cheques</span>
              <div className="manual-line" />
              <span className="text-black/60">Transferencias</span>
              <div className="manual-line" />
              <span className="text-black/60">Devoluciones</span>
              <div className="manual-line" />
              <span className="text-black/60">Incidentes</span>
              <div className="manual-line" />
            </div>
          </div>

          <div className="rounded border border-black/25 p-2.5">
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide">Kilometraje</h3>
            <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
              <span className="text-black/60">Km salida</span>
              <div className="manual-line" />
              <span className="text-black/60">Km regreso</span>
              <div className="manual-line" />
              <span className="text-black/60">Km recorridos</span>
              <div className="manual-line" />
              <span className="text-black/60">Hora salida</span>
              <div className="manual-line" />
              <span className="text-black/60">Hora regreso</span>
              <div className="manual-line" />
            </div>
          </div>
        </section>

        {/* Firmas */}
        <section className="mt-10 grid grid-cols-3 gap-6 text-[11px]">
          <div>
            <div className="border-t border-black pt-1 text-center text-black/60">Chofer</div>
          </div>
          <div>
            <div className="border-t border-black pt-1 text-center text-black/60">Depósito</div>
          </div>
          <div>
            <div className="border-t border-black pt-1 text-center text-black/60">Administración</div>
          </div>
        </section>
      </div>
    </>
  );
}
