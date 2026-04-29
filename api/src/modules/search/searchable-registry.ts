import { AppDataSource } from '../../config/data-source';
import { PERMISSIONS } from '../permissions/permissions.constants';

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
  meta?: Record<string, unknown>;
}

export interface SearchableEntity {
  type: string;
  label: string;
  permission: string;
  search: (q: string, limit: number) => Promise<SearchResult[]>;
}

const like = (q: string) => `%${q}%`;

const asPositiveInt = (q: string): number | null => {
  if (!/^\d+$/.test(q)) return null;
  const n = Number(q);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const SEARCHABLE_ENTITIES: SearchableEntity[] = [
  {
    type: 'customer',
    label: 'Clientes',
    permission: PERMISSIONS.CUSTOMERS.VIEW,
    search: async (q, limit) => {
      const pattern = like(q);
      const rows: Array<{
        id: string;
        legal_name: string;
        commercial_name: string | null;
        tax_id: string | null;
      }> = await AppDataSource.query(
        `SELECT id, legal_name, commercial_name, tax_id
         FROM customers
         WHERE deleted_at IS NULL
           AND (legal_name ILIKE $1 OR commercial_name ILIKE $1 OR tax_id ILIKE $1)
         ORDER BY GREATEST(
           similarity(COALESCE(legal_name, ''), $2),
           similarity(COALESCE(commercial_name, ''), $2),
           similarity(COALESCE(tax_id, ''), $2)
         ) DESC
         LIMIT $3`,
        [pattern, q, limit]
      );
      return rows.map((r) => ({
        id: r.id,
        type: 'customer',
        title: r.commercial_name || r.legal_name,
        subtitle: r.tax_id ? `CUIT ${r.tax_id}` : r.legal_name,
        href: `/clientes/${r.id}`,
      }));
    },
  },

  {
    type: 'product',
    label: 'Productos',
    permission: PERMISSIONS.PRODUCTS.VIEW,
    search: async (q, limit) => {
      const pattern = like(q);
      const rows: Array<{
        id: string;
        name: string;
        sku: string | null;
        base_price: string;
      }> = await AppDataSource.query(
        `SELECT id, name, sku, base_price
         FROM products
         WHERE deleted_at IS NULL
           AND (name ILIKE $1 OR sku ILIKE $1)
         ORDER BY GREATEST(
           similarity(name, $2),
           similarity(COALESCE(sku, ''), $2)
         ) DESC
         LIMIT $3`,
        [pattern, q, limit]
      );
      return rows.map((r) => ({
        id: r.id,
        type: 'product',
        title: r.name,
        subtitle: r.sku ? `SKU ${r.sku}` : undefined,
        href: `/catalogo/${r.id}`,
        meta: { basePrice: r.base_price },
      }));
    },
  },

  {
    type: 'supplier',
    label: 'Proveedores',
    permission: PERMISSIONS.SUPPLIERS.VIEW,
    search: async (q, limit) => {
      const pattern = like(q);
      const rows: Array<{
        id: string;
        name: string;
        tax_id: string | null;
        email: string | null;
      }> = await AppDataSource.query(
        `SELECT id, name, tax_id, email
         FROM suppliers
         WHERE deleted_at IS NULL
           AND (name ILIKE $1 OR tax_id ILIKE $1 OR email ILIKE $1)
         ORDER BY GREATEST(
           similarity(name, $2),
           similarity(COALESCE(tax_id, ''), $2),
           similarity(COALESCE(email, ''), $2)
         ) DESC
         LIMIT $3`,
        [pattern, q, limit]
      );
      return rows.map((r) => ({
        id: r.id,
        type: 'supplier',
        title: r.name,
        subtitle: r.tax_id ? `CUIT ${r.tax_id}` : r.email ?? undefined,
        href: `/compras/proveedores`,
        meta: { supplierId: r.id },
      }));
    },
  },

  {
    type: 'order',
    label: 'Pedidos',
    permission: PERMISSIONS.ORDERS.VIEW,
    search: async (q, limit) => {
      const pattern = like(q);
      const num = asPositiveInt(q);
      const rows: Array<{
        id: string;
        number: number;
        status: string;
        total: string;
        customer_name: string | null;
      }> = await AppDataSource.query(
        `SELECT o.id, o.number, o.status, o.total,
                COALESCE(c.commercial_name, c.legal_name) AS customer_name
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
         WHERE o.deleted_at IS NULL
           AND (
             ($3::int IS NOT NULL AND o.number = $3::int)
             OR c.legal_name ILIKE $1
             OR c.commercial_name ILIKE $1
           )
         ORDER BY
           CASE WHEN $3::int IS NOT NULL AND o.number = $3::int THEN 0 ELSE 1 END,
           o.number DESC
         LIMIT $2`,
        [pattern, limit, num]
      );
      return rows.map((r) => ({
        id: r.id,
        type: 'order',
        title: `Pedido #${r.number}`,
        subtitle: r.customer_name ?? undefined,
        href: `/pedidos`,
        meta: { orderId: r.id, status: r.status, total: r.total },
      }));
    },
  },

  {
    type: 'invoice',
    label: 'Facturas',
    permission: PERMISSIONS.INVOICES.VIEW,
    search: async (q, limit) => {
      const pattern = like(q);
      const rows: Array<{
        id: string;
        number: string | null;
        status: string;
        total: string;
        customer_name: string | null;
      }> = await AppDataSource.query(
        `SELECT i.id, i.number, i.status, i.total,
                COALESCE(c.commercial_name, c.legal_name) AS customer_name
         FROM invoices i
         LEFT JOIN customers c ON c.id = i.customer_id
         WHERE i.deleted_at IS NULL
           AND (
             i.number ILIKE $1
             OR c.legal_name ILIKE $1
             OR c.commercial_name ILIKE $1
           )
         ORDER BY
           CASE WHEN i.number ILIKE $1 THEN 0 ELSE 1 END,
           i.issue_date DESC NULLS LAST
         LIMIT $2`,
        [pattern, limit]
      );
      return rows.map((r) => ({
        id: r.id,
        type: 'invoice',
        title: r.number ? `Factura ${r.number}` : 'Factura (borrador)',
        subtitle: r.customer_name ?? undefined,
        href: `/comprobantes`,
        meta: { invoiceId: r.id, status: r.status, total: r.total },
      }));
    },
  },

  {
    type: 'supplier-invoice',
    label: 'Facturas de proveedor',
    permission: PERMISSIONS.SUPPLIER_INVOICES.VIEW,
    search: async (q, limit) => {
      const pattern = like(q);
      const num = asPositiveInt(q);
      const rows: Array<{
        id: string;
        number: number;
        supplier_invoice_number: string;
        status: string;
        total: string;
        supplier_name: string | null;
      }> = await AppDataSource.query(
        `SELECT si.id, si.number, si.supplier_invoice_number, si.status, si.total,
                s.name AS supplier_name
         FROM supplier_invoices si
         LEFT JOIN suppliers s ON s.id = si.supplier_id
         WHERE si.deleted_at IS NULL
           AND (
             ($3::int IS NOT NULL AND si.number = $3::int)
             OR si.supplier_invoice_number ILIKE $1
             OR s.name ILIKE $1
           )
         ORDER BY si.issue_date DESC NULLS LAST
         LIMIT $2`,
        [pattern, limit, num]
      );
      return rows.map((r) => ({
        id: r.id,
        type: 'supplier-invoice',
        title: `Fact. prov. ${r.supplier_invoice_number}`,
        subtitle: r.supplier_name ?? `Interna #${r.number}`,
        href: `/compras/facturas/${r.id}`,
        meta: { status: r.status, total: r.total },
      }));
    },
  },

  {
    type: 'user',
    label: 'Usuarios',
    permission: PERMISSIONS.USERS.VIEW,
    search: async (q, limit) => {
      const pattern = like(q);
      const rows: Array<{
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        status: string;
      }> = await AppDataSource.query(
        `SELECT id, first_name, last_name, email, status
         FROM users
         WHERE deleted_at IS NULL
           AND (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)
         ORDER BY GREATEST(
           similarity(first_name, $2),
           similarity(last_name, $2),
           similarity(email, $2)
         ) DESC
         LIMIT $3`,
        [pattern, q, limit]
      );
      return rows.map((r) => ({
        id: r.id,
        type: 'user',
        title: `${r.first_name} ${r.last_name}`.trim(),
        subtitle: r.email,
        href: `/equipo?tab=usuarios`,
        meta: { userId: r.id, status: r.status },
      }));
    },
  },

  {
    type: 'shipment',
    label: 'Envíos',
    permission: PERMISSIONS.SHIPMENTS.VIEW,
    search: async (q, limit) => {
      const num = asPositiveInt(q);
      if (num === null) return [];
      const rows: Array<{
        id: string;
        number: number;
        status: string;
        planned_date: string;
      }> = await AppDataSource.query(
        `SELECT id, number, status, planned_date
         FROM shipments
         WHERE deleted_at IS NULL AND number = $1
         ORDER BY planned_date DESC NULLS LAST
         LIMIT $2`,
        [num, limit]
      );
      return rows.map((r) => ({
        id: r.id,
        type: 'shipment',
        title: `Envío #${r.number}`,
        subtitle: r.planned_date ? `Plan. ${r.planned_date}` : undefined,
        href: `/logistica/envios/${r.id}`,
        meta: { status: r.status },
      }));
    },
  },
];
