/**
 * Registry for the advanced reports section.
 *
 * Every report is defined once here: title, description, columns (typed +
 * localized), filters, fetcher and empty-state copy. The detail page reads
 * this registry and renders a properly typed table instead of the old
 * `Object.keys(rows[0])` render that leaked backend keys and raw IDs to the UI.
 *
 * Prefer names over ids in the `columns` array. Keep ids in the payload for
 * trazability (links, filters), but hide them by default via `hidden: true`.
 */
import {
  getSalesBySeller, getSalesByZone, getSalesByChannel,
  getProfitabilityByProduct, getProfitabilityByCustomer,
  getStockRotation, getOnTimeDelivery, getFillRate, getPickingThroughput,
  getAging, getCashFlowProjection, getCheckPortfolio,
  getReturnsByReason, getThreeWayMatchDiscrepancies,
} from "@/lib/actions/reports";
import {
  CHECK_STATUS_LABELS,
  RETURN_KIND_LABELS,
  THREE_WAY_STATUS_LABELS,
} from "@/lib/types";

export type ReportColumnType =
  | "text"
  | "money"
  | "number"
  | "percent"
  | "date"
  | "enum";

export interface ReportColumn {
  key: string;
  label: string;
  type: ReportColumnType;
  align?: "left" | "right" | "center";
  hidden?: boolean;
  /** For `enum`: maps raw value → Spanish label. */
  enumLabels?: Record<string, string>;
  /** Fallback used when the value is null/undefined/empty. Defaults to "—". */
  fallback?: string;
}

export interface ReportParam {
  key: string;
  label: string;
  type: "date" | "number" | "text";
  default?: string;
}

export interface ReportSummary {
  label: string;
  type: "money" | "number" | "percent";
  /** Picks a value from the raw response. Defaults to `rows.sum(key)`. */
  compute: (raw: unknown, rows: Array<Record<string, unknown>>) => number;
}

export interface ReportDefinition {
  slug: string;
  label: string;
  description: string;
  category: "ventas" | "financieros" | "logistica" | "operativos";
  fetcher: (params?: Record<string, string | number | undefined>) => Promise<unknown>;
  /** Turns the raw backend response into table rows. Defaults to array passthrough. */
  transform?: (raw: unknown) => Array<Record<string, unknown>>;
  columns: ReportColumn[];
  paramsForm?: ReportParam[];
  emptyState: string;
  /** Optional KPI cards above the table (on-time delivery %, fill-rate, etc). */
  summaries?: ReportSummary[];
}

// ─── helpers ─────────────────────────────────────────────────────────

function sum(rows: Array<Record<string, unknown>>, key: string): number {
  return rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);
}

function asArray(raw: unknown): Array<Record<string, unknown>> {
  return Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
}

// ─── definitions ─────────────────────────────────────────────────────

const REPORTS: Record<string, ReportDefinition> = {
  "sales-by-seller": {
    slug: "sales-by-seller",
    label: "Ventas por vendedor",
    description: "Total facturado y cantidad de pedidos por vendedor en el período.",
    category: "ventas",
    fetcher: getSalesBySeller,
    paramsForm: [
      { key: "from", label: "Desde", type: "date" },
      { key: "to", label: "Hasta", type: "date" },
    ],
    emptyState: "No se registraron ventas en el período seleccionado.",
    columns: [
      { key: "sellerId", label: "ID", type: "text", hidden: true },
      { key: "sellerName", label: "Vendedor", type: "text", fallback: "Sin vendedor" },
      { key: "orderCount", label: "Pedidos", type: "number", align: "right" },
      { key: "totalRevenue", label: "Facturado", type: "money", align: "right" },
    ],
    summaries: [
      { label: "Facturado total", type: "money", compute: (_r, rows) => sum(rows, "totalRevenue") },
      { label: "Pedidos totales", type: "number", compute: (_r, rows) => sum(rows, "orderCount") },
    ],
  },

  "sales-by-zone": {
    slug: "sales-by-zone",
    label: "Ventas por zona",
    description: "Distribución del facturado por zona comercial.",
    category: "ventas",
    fetcher: getSalesByZone,
    paramsForm: [
      { key: "from", label: "Desde", type: "date" },
      { key: "to", label: "Hasta", type: "date" },
    ],
    emptyState: "No hay pedidos con zona asignada en el período.",
    columns: [
      { key: "zoneId", label: "ID", type: "text", hidden: true },
      { key: "zoneName", label: "Zona", type: "text", fallback: "Sin zona" },
      { key: "orderCount", label: "Pedidos", type: "number", align: "right" },
      { key: "totalRevenue", label: "Facturado", type: "money", align: "right" },
    ],
    summaries: [
      { label: "Facturado total", type: "money", compute: (_r, rows) => sum(rows, "totalRevenue") },
    ],
  },

  "sales-by-channel": {
    slug: "sales-by-channel",
    label: "Ventas por canal",
    description: "Qué porcentaje de la facturación viene por cada canal.",
    category: "ventas",
    fetcher: getSalesByChannel,
    paramsForm: [
      { key: "from", label: "Desde", type: "date" },
      { key: "to", label: "Hasta", type: "date" },
    ],
    emptyState: "No se registraron ventas en el período.",
    columns: [
      {
        key: "channel",
        label: "Canal",
        type: "enum",
        enumLabels: {
          manual: "Manual",
          portal: "Portal cliente",
          whatsapp: "WhatsApp",
          ecommerce: "E-commerce",
          pos: "Mostrador",
        },
        fallback: "Sin canal",
      },
      { key: "orderCount", label: "Pedidos", type: "number", align: "right" },
      { key: "totalRevenue", label: "Facturado", type: "money", align: "right" },
    ],
  },

  "profitability-by-product": {
    slug: "profitability-by-product",
    label: "Rentabilidad por producto",
    description: "Facturación, costo estimado y margen por producto en el período.",
    category: "financieros",
    fetcher: getProfitabilityByProduct,
    paramsForm: [
      { key: "from", label: "Desde", type: "date" },
      { key: "to", label: "Hasta", type: "date" },
    ],
    emptyState: "No hay ventas de productos en el período.",
    columns: [
      { key: "productId", label: "ID", type: "text", hidden: true },
      { key: "productName", label: "Producto", type: "text", fallback: "Producto eliminado" },
      { key: "productSku", label: "SKU", type: "text", fallback: "" },
      { key: "revenue", label: "Facturado", type: "money", align: "right" },
      { key: "cost", label: "Costo", type: "money", align: "right" },
      { key: "margin", label: "Margen", type: "money", align: "right" },
    ],
  },

  "profitability-by-customer": {
    slug: "profitability-by-customer",
    label: "Rentabilidad por cliente",
    description: "Margen bruto estimado por cliente en el período.",
    category: "financieros",
    fetcher: getProfitabilityByCustomer,
    paramsForm: [
      { key: "from", label: "Desde", type: "date" },
      { key: "to", label: "Hasta", type: "date" },
    ],
    emptyState: "Sin ventas por cliente en el período.",
    columns: [
      { key: "customerId", label: "ID", type: "text", hidden: true },
      { key: "customerName", label: "Cliente", type: "text", fallback: "Cliente eliminado" },
      { key: "revenue", label: "Facturado", type: "money", align: "right" },
      { key: "cost", label: "Costo", type: "money", align: "right" },
      { key: "margin", label: "Margen", type: "money", align: "right" },
    ],
  },

  aging: {
    slug: "aging",
    label: "Antigüedad de deuda",
    description: "Saldo vencido por cliente, distribuido en tramos de días.",
    category: "financieros",
    fetcher: getAging,
    paramsForm: [
      { key: "buckets", label: "Buckets (días)", type: "text", default: "30,60,90" },
    ],
    emptyState: "No hay deuda pendiente de clientes.",
    transform: (raw) => {
      // Backend returns { labels, byBucket, customers: [{customerId, customerName, total, buckets: {label: amount}}] }
      if (!raw || typeof raw !== "object") return [];
      const obj = raw as { customers?: Array<{ customerId: string; customerName: string | null; total: number; buckets: Record<string, number> }>; labels?: string[] };
      const customers = obj.customers ?? [];
      return customers.map((c) => {
        const row: Record<string, unknown> = {
          customerId: c.customerId,
          customerName: c.customerName,
          total: c.total,
        };
        for (const [k, v] of Object.entries(c.buckets ?? {})) row[`bucket_${k}`] = v;
        return row;
      });
    },
    columns: [
      { key: "customerId", label: "ID", type: "text", hidden: true },
      { key: "customerName", label: "Cliente", type: "text", fallback: "Cliente eliminado" },
      { key: "total", label: "Total", type: "money", align: "right" },
      { key: "bucket_0-30", label: "0 a 30 d", type: "money", align: "right" },
      { key: "bucket_31-60", label: "31 a 60 d", type: "money", align: "right" },
      { key: "bucket_61-90", label: "61 a 90 d", type: "money", align: "right" },
      { key: "bucket_91+", label: "91 d o más", type: "money", align: "right" },
    ],
    summaries: [
      { label: "Deuda total", type: "money", compute: (_r, rows) => sum(rows, "total") },
    ],
  },

  "cash-flow-projection": {
    slug: "cash-flow-projection",
    label: "Proyección de flujo de caja",
    description: "Ingresos proyectados por cheques depositados vs egresos por facturas a proveedores, semana por semana.",
    category: "financieros",
    fetcher: getCashFlowProjection,
    paramsForm: [
      { key: "weeks", label: "Semanas a proyectar", type: "number", default: "4" },
    ],
    emptyState: "No hay cheques ni pagos proyectados en el rango.",
    transform: (raw) => {
      if (!raw || typeof raw !== "object") return [];
      const obj = raw as { inflows?: Array<{ week: string; amount: number }>; outflows?: Array<{ week: string; amount: number }> };
      const byWeek: Record<string, { inflow: number; outflow: number }> = {};
      const add = (arr: Array<{ week: string; amount: number }> | undefined, field: "inflow" | "outflow") => {
        for (const r of arr ?? []) {
          const key = typeof r.week === "string" ? r.week.slice(0, 10) : new Date(r.week).toISOString().slice(0, 10);
          if (!byWeek[key]) byWeek[key] = { inflow: 0, outflow: 0 };
          byWeek[key][field] += Number(r.amount ?? 0);
        }
      };
      add(obj.inflows, "inflow");
      add(obj.outflows, "outflow");
      return Object.entries(byWeek)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, v]) => ({ week, inflow: v.inflow, outflow: v.outflow, net: v.inflow - v.outflow }));
    },
    columns: [
      { key: "week", label: "Semana", type: "date" },
      { key: "inflow", label: "Ingresos", type: "money", align: "right" },
      { key: "outflow", label: "Egresos", type: "money", align: "right" },
      { key: "net", label: "Neto", type: "money", align: "right" },
    ],
    summaries: [
      { label: "Ingresos totales", type: "money", compute: (_r, rows) => sum(rows, "inflow") },
      { label: "Egresos totales", type: "money", compute: (_r, rows) => sum(rows, "outflow") },
      { label: "Neto proyectado", type: "money", compute: (_r, rows) => sum(rows, "net") },
    ],
  },

  "check-portfolio": {
    slug: "check-portfolio",
    label: "Cheques en cartera",
    description: "Cheques de terceros vigentes, con banco, cliente y vencimiento.",
    category: "financieros",
    fetcher: getCheckPortfolio,
    emptyState: "No hay cheques en cartera en este momento.",
    columns: [
      { key: "id", label: "ID", type: "text", hidden: true },
      { key: "number", label: "Número", type: "text" },
      { key: "bankName", label: "Banco", type: "text" },
      { key: "customerName", label: "Cliente", type: "text", fallback: "Cheque propio" },
      { key: "dueDate", label: "Vencimiento", type: "date" },
      { key: "amount", label: "Importe", type: "money", align: "right" },
      { key: "status", label: "Estado", type: "enum", enumLabels: CHECK_STATUS_LABELS },
    ],
    summaries: [
      { label: "Total en cartera", type: "money", compute: (_r, rows) => sum(rows, "amount") },
      { label: "Cantidad de cheques", type: "number", compute: (_r, rows) => rows.length },
    ],
  },

  "stock-rotation": {
    slug: "stock-rotation",
    label: "Rotación de stock",
    description: "Movimientos de salida vs ingreso por producto en el período.",
    category: "logistica",
    fetcher: getStockRotation,
    paramsForm: [{ key: "period", label: "Período (días)", type: "number", default: "30" }],
    emptyState: "Sin movimientos de stock en el período.",
    columns: [
      { key: "productId", label: "ID", type: "text", hidden: true },
      { key: "productName", label: "Producto", type: "text", fallback: "Producto eliminado" },
      { key: "productSku", label: "SKU", type: "text", fallback: "" },
      { key: "outQty", label: "Salidas", type: "number", align: "right" },
      { key: "inQty", label: "Ingresos", type: "number", align: "right" },
    ],
  },

  "on-time-delivery": {
    slug: "on-time-delivery",
    label: "Cumplimiento de entrega",
    description: "Porcentaje de paradas entregadas dentro del plazo planificado.",
    category: "logistica",
    fetcher: getOnTimeDelivery,
    paramsForm: [
      { key: "from", label: "Desde", type: "date" },
      { key: "to", label: "Hasta", type: "date" },
    ],
    emptyState: "No hay paradas entregadas en el período.",
    transform: (raw) => {
      if (!raw || typeof raw !== "object") return [];
      const r = raw as { total: number; onTime: number; pct: number };
      if (!r.total) return [];
      return [{ metric: "Entregas a tiempo", total: r.total, onTime: r.onTime, pct: r.pct }];
    },
    columns: [
      { key: "metric", label: "Indicador", type: "text" },
      { key: "total", label: "Paradas totales", type: "number", align: "right" },
      { key: "onTime", label: "A tiempo", type: "number", align: "right" },
      { key: "pct", label: "% cumplimiento", type: "percent", align: "right" },
    ],
  },

  "fill-rate": {
    slug: "fill-rate",
    label: "Tasa de preparación",
    description: "Cuánto de lo pedido se pudo preparar realmente (picked vs requested).",
    category: "logistica",
    fetcher: getFillRate,
    paramsForm: [
      { key: "from", label: "Desde", type: "date" },
      { key: "to", label: "Hasta", type: "date" },
    ],
    emptyState: "No se registraron preparaciones en el período.",
    transform: (raw) => {
      if (!raw || typeof raw !== "object") return [];
      const r = raw as { requested: number; picked: number; pct: number };
      if (!r.requested) return [];
      return [{ metric: "Preparación", requested: r.requested, picked: r.picked, pct: r.pct }];
    },
    columns: [
      { key: "metric", label: "Indicador", type: "text" },
      { key: "requested", label: "Pedido", type: "number", align: "right" },
      { key: "picked", label: "Preparado", type: "number", align: "right" },
      { key: "pct", label: "% preparación", type: "percent", align: "right" },
    ],
  },

  "picking-throughput": {
    slug: "picking-throughput",
    label: "Productividad de picking",
    description: "Tareas de picking completadas y duración promedio en el período.",
    category: "logistica",
    fetcher: getPickingThroughput,
    paramsForm: [
      { key: "from", label: "Desde", type: "date" },
      { key: "to", label: "Hasta", type: "date" },
    ],
    emptyState: "No se completaron tareas de picking en el período.",
    transform: (raw) => {
      if (!raw || typeof raw !== "object") return [];
      const r = raw as { tasksCompleted: number | string; avgDurationSec: number | string };
      const tasks = Number(r.tasksCompleted ?? 0);
      if (!tasks) return [];
      const avgSec = Number(r.avgDurationSec ?? 0);
      const avgMin = Math.round(avgSec / 60);
      return [{ metric: "Picking", tasks, avgMin }];
    },
    columns: [
      { key: "metric", label: "Indicador", type: "text" },
      { key: "tasks", label: "Tareas completadas", type: "number", align: "right" },
      { key: "avgMin", label: "Duración promedio (min)", type: "number", align: "right" },
    ],
  },

  "returns-by-reason": {
    slug: "returns-by-reason",
    label: "Devoluciones por motivo",
    description: "Distribución de devoluciones agrupadas por tipo.",
    category: "logistica",
    fetcher: getReturnsByReason,
    paramsForm: [
      { key: "from", label: "Desde", type: "date" },
      { key: "to", label: "Hasta", type: "date" },
    ],
    emptyState: "No hay devoluciones registradas en el período.",
    columns: [
      { key: "kind", label: "Motivo", type: "enum", enumLabels: RETURN_KIND_LABELS, fallback: "Sin motivo" },
      { key: "count", label: "Cantidad", type: "number", align: "right" },
    ],
  },

  "three-way-match-discrepancies": {
    slug: "three-way-match-discrepancies",
    label: "Conciliación 3 vías",
    description: "Estado de la conciliación entre orden de compra, remito y factura del proveedor.",
    category: "operativos",
    fetcher: getThreeWayMatchDiscrepancies,
    emptyState: "No hay conciliaciones 3 vías registradas.",
    columns: [
      { key: "status", label: "Estado", type: "enum", enumLabels: THREE_WAY_STATUS_LABELS, fallback: "—" },
      { key: "count", label: "Cantidad", type: "number", align: "right" },
    ],
  },
};

export function getReport(slug: string): ReportDefinition | undefined {
  return REPORTS[slug];
}

export function listReports(): ReportDefinition[] {
  return Object.values(REPORTS);
}

export function listReportsByCategory(cat: ReportDefinition["category"]): ReportDefinition[] {
  return listReports().filter((r) => r.category === cat);
}

export function normalizeReportRows(def: ReportDefinition, raw: unknown): Array<Record<string, unknown>> {
  if (def.transform) return def.transform(raw);
  return asArray(raw);
}
