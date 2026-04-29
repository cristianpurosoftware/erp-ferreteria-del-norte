/**
 * Dedicated demo seed for Comprobantes: invoices, delivery notes,
 * credit notes and debit notes.
 *
 * Safety:
 *   - Blocked in production unless SEED_CONFIRM=yes.
 *   - Idempotent: skips if the seed has already run (tagged via
 *     `metadata.seed = 'comprobantes-demo'`).
 *   - Clean reset with RESET_COMPROBANTES_SEED=yes: deletes only records
 *     created by this seed.
 *
 * Run:
 *   cd api && npm run seed:comprobantes
 *   RESET_COMPROBANTES_SEED=yes npm run seed:comprobantes
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';

const SEED_TAG = 'comprobantes-demo';

const INVOICE_STATUSES = ['draft', 'pending_issue', 'issued', 'cancelled', 'voided'] as const;
const DELIVERY_STATUSES = ['draft', 'issued', 'invoiced', 'cancelled'] as const;
const NOTE_STATUSES = ['draft', 'issued', 'cancelled'] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomAmount(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function randomCae(): string {
  return String(1e13 + Math.floor(Math.random() * 9e12));
}

async function resetSeed() {
  console.log('RESET_COMPROBANTES_SEED=yes → deleting previous seed records…');
  // Order matters: items before parents, DN after invoices (invoice may FK dn).
  await AppDataSource.query(
    `DELETE FROM debit_note_items WHERE debit_note_id IN (SELECT id FROM debit_notes WHERE metadata->>'seed' = $1)`,
    [SEED_TAG],
  );
  await AppDataSource.query(`DELETE FROM debit_notes WHERE metadata->>'seed' = $1`, [SEED_TAG]);
  await AppDataSource.query(
    `DELETE FROM credit_note_items WHERE credit_note_id IN (SELECT id FROM credit_notes WHERE metadata->>'seed' = $1)`,
    [SEED_TAG],
  );
  await AppDataSource.query(`DELETE FROM credit_notes WHERE metadata->>'seed' = $1`, [SEED_TAG]);
  await AppDataSource.query(
    `DELETE FROM delivery_note_items WHERE delivery_note_id IN (SELECT id FROM delivery_notes WHERE metadata->>'seed' = $1)`,
    [SEED_TAG],
  );
  await AppDataSource.query(`DELETE FROM delivery_notes WHERE metadata->>'seed' = $1`, [SEED_TAG]);
  await AppDataSource.query(`DELETE FROM invoices WHERE metadata->>'seed' = $1`, [SEED_TAG]);
}

async function alreadyRan(): Promise<boolean> {
  const rows = await AppDataSource.query(
    `SELECT COUNT(*)::int AS n FROM invoices WHERE metadata->>'seed' = $1`,
    [SEED_TAG],
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

interface CustomerRef { id: string }
interface ProductRef { id: string; name: string; sku: string | null; base_price: string | number | null }
interface WarehouseRef { id: string }

async function fetchRefs() {
  const customers: CustomerRef[] = await AppDataSource.query(
    `SELECT id FROM customers WHERE deleted_at IS NULL LIMIT 200`,
  );
  const products: ProductRef[] = await AppDataSource.query(
    `SELECT id, name, sku, COALESCE(base_price::numeric, 0) AS base_price
       FROM products WHERE deleted_at IS NULL LIMIT 200`,
  );
  const warehouses: WarehouseRef[] = await AppDataSource.query(
    `SELECT id FROM warehouses WHERE deleted_at IS NULL LIMIT 20`,
  );
  if (customers.length < 10) throw new Error('Need at least 10 live customers. Seed master/demo first.');
  if (products.length < 10) throw new Error('Need at least 10 live products. Seed catalog first.');
  return { customers, products, warehouses };
}

async function seedInvoices(refs: Awaited<ReturnType<typeof fetchRefs>>) {
  const rows: Array<{ id: string; status: string; total: number }> = [];
  for (let i = 0; i < 40; i++) {
    const status = pick(INVOICE_STATUSES);
    const customer = pick(refs.customers);
    const subtotal = randomAmount(5000, 250000);
    const taxes = Number((subtotal * 0.21).toFixed(2));
    const total = Number((subtotal + taxes).toFixed(2));
    const issueDate = daysAgo(randomBetween(0, 60)).toISOString().slice(0, 10);
    const seedKey = `invoice-${String(i + 1).padStart(3, '0')}`;

    const isEmitida = status === 'issued';
    const row = await AppDataSource.query(
      `INSERT INTO invoices
        (customer_id, issue_date, number, sales_point, invoice_type,
         subtotal, taxes, total, status, cae, cae_expiration, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
       RETURNING id, status, total`,
      [
        customer.id,
        issueDate,
        isEmitida ? String(10000 + i) : null,
        isEmitida ? '0001' : null,
        pick(['A', 'B', 'C']),
        subtotal,
        taxes,
        total,
        status,
        isEmitida ? randomCae() : null,
        isEmitida ? daysAgo(-10).toISOString().slice(0, 10) : null,
        JSON.stringify({ seed: SEED_TAG, seedKey }),
      ],
    );
    rows.push(row[0]);
  }
  console.log(`✓ ${rows.length} facturas`);
  return rows;
}

async function seedDeliveryNotes(refs: Awaited<ReturnType<typeof fetchRefs>>) {
  let itemCount = 0;
  for (let i = 0; i < 30; i++) {
    const status = pick(DELIVERY_STATUSES);
    const customer = pick(refs.customers);
    const warehouse = refs.warehouses.length > 0 ? pick(refs.warehouses) : null;
    const issueDate = daysAgo(randomBetween(0, 45)).toISOString().slice(0, 10);
    const seedKey = `delivery-${String(i + 1).padStart(3, '0')}`;
    const number = `R-${String(5000 + i).padStart(6, '0')}`;

    const dn = await AppDataSource.query(
      `INSERT INTO delivery_notes
        (number, sales_point, invoice_type, issue_date, customer_id,
         warehouse_id, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING id`,
      [number, '0001', 'X', issueDate, customer.id, warehouse?.id ?? null, status,
       JSON.stringify({ seed: SEED_TAG, seedKey })],
    );
    const dnId = dn[0].id;

    const lineCount = randomBetween(1, 4);
    for (let j = 0; j < lineCount; j++) {
      const product = pick(refs.products);
      const qty = randomBetween(1, 10);
      const unitPrice = Number(product.base_price) > 0 ? Number(product.base_price) : randomAmount(500, 5000);
      await AppDataSource.query(
        `INSERT INTO delivery_note_items (delivery_note_id, product_id, quantity, unit_price, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [dnId, product.id, qty, unitPrice, JSON.stringify({ seed: SEED_TAG })],
      );
      itemCount++;
    }
  }
  console.log(`✓ 30 remitos · ${itemCount} items`);
}

async function seedNotes(
  kind: 'credit' | 'debit',
  count: number,
  issuedInvoices: Array<{ id: string; total: number }>,
  refs: Awaited<ReturnType<typeof fetchRefs>>,
) {
  if (issuedInvoices.length === 0) {
    console.log(`… ${kind} notes skipped (no issued invoices to reference)`);
    return;
  }
  const parentTable = kind === 'credit' ? 'credit_notes' : 'debit_notes';
  const itemsTable = kind === 'credit' ? 'credit_note_items' : 'debit_note_items';
  const itemFk = kind === 'credit' ? 'credit_note_id' : 'debit_note_id';
  const reasons = kind === 'credit'
    ? ['Devolución comercial', 'Descuento post-venta', 'Producto dañado', 'Ajuste de precio']
    : ['Ajuste de precio', 'Intereses por mora', 'Gastos administrativos', 'Diferencia de cambio'];
  const prefix = kind === 'credit' ? 'NC' : 'ND';

  let itemCount = 0;
  for (let i = 0; i < count; i++) {
    const status = pick(NOTE_STATUSES);
    const original = pick(issuedInvoices);
    const customer = pick(refs.customers);
    const subtotal = randomAmount(Number(original.total) * 0.1, Number(original.total) * 0.9);
    const taxes = Number((subtotal * 0.21).toFixed(2));
    const total = Number((subtotal + taxes).toFixed(2));
    const issueDate = daysAgo(randomBetween(0, 30)).toISOString().slice(0, 10);
    const seedKey = `${kind}-note-${String(i + 1).padStart(3, '0')}`;

    const note = await AppDataSource.query(
      `INSERT INTO ${parentTable}
        (number, sales_point, invoice_type, issue_date, customer_id,
         original_invoice_id, subtotal, taxes, total, reason, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
       RETURNING id`,
      [
        status === 'issued' ? `${prefix}-${String(3000 + i).padStart(6, '0')}` : null,
        '0001', 'A', issueDate, customer.id, original.id,
        subtotal, taxes, total, pick(reasons), status,
        JSON.stringify({ seed: SEED_TAG, seedKey }),
      ],
    );
    const noteId = note[0].id;

    const lineCount = randomBetween(1, 3);
    let runningSubtotal = 0;
    for (let j = 0; j < lineCount; j++) {
      const product = refs.products.length > 0 && Math.random() < 0.7 ? pick(refs.products) : null;
      const qty = randomBetween(1, 5);
      const unitPrice = product?.base_price ? Number(product.base_price) : randomAmount(500, 5000);
      const lineSubtotal = Number((qty * unitPrice).toFixed(2));
      runningSubtotal += lineSubtotal;
      await AppDataSource.query(
        `INSERT INTO ${itemsTable} (${itemFk}, product_id, description, quantity, unit_price, subtotal, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          noteId,
          product?.id ?? null,
          product?.name ?? (kind === 'credit' ? 'Ajuste comercial' : 'Cargo adicional'),
          qty, unitPrice, lineSubtotal,
          JSON.stringify({ seed: SEED_TAG }),
        ],
      );
      itemCount++;
    }
  }
  console.log(`✓ ${count} notas de ${kind === 'credit' ? 'crédito' : 'débito'} · ${itemCount} items`);
}

async function main() {
  if (env.NODE_ENV === 'production' && process.env.SEED_CONFIRM !== 'yes') {
    console.error('✖ Refusing to run in production without SEED_CONFIRM=yes.');
    process.exit(2);
  }

  await AppDataSource.initialize();
  console.log('DB connected');

  if (process.env.RESET_COMPROBANTES_SEED === 'yes') {
    await resetSeed();
  } else if (await alreadyRan()) {
    console.log('Seed already applied (metadata.seed=comprobantes-demo). Skip.');
    console.log('  Use RESET_COMPROBANTES_SEED=yes to wipe and re-apply.');
    await AppDataSource.destroy();
    return;
  }

  const refs = await fetchRefs();
  console.log(`Preflight: ${refs.customers.length} customers, ${refs.products.length} products, ${refs.warehouses.length} warehouses.`);

  const invoices = await seedInvoices(refs);
  await seedDeliveryNotes(refs);

  const issuedInvoices = invoices.filter((i) => i.status === 'issued').map((i) => ({ id: i.id, total: Number(i.total) }));
  await seedNotes('credit', 15, issuedInvoices, refs);
  await seedNotes('debit', 10, issuedInvoices, refs);

  console.log('✔ Seed comprobantes completo.');
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
