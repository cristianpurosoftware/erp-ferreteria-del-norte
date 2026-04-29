import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';

type Check = { name: string; query: string; expectMin?: number; expectMax?: number; expect?: (v: number) => boolean };

const checks: Check[] = [
  { name: 'branches >= 4', query: `SELECT COUNT(*)::int AS n FROM branches`, expectMin: 4 },
  { name: 'warehouses >= 4', query: `SELECT COUNT(*)::int AS n FROM warehouses`, expectMin: 4 },
  { name: 'users >= 30', query: `SELECT COUNT(*)::int AS n FROM users`, expectMin: 30 },
  { name: 'brands >= 25', query: `SELECT COUNT(*)::int AS n FROM brands`, expectMin: 25 },
  { name: 'products >= 180', query: `SELECT COUNT(*)::int AS n FROM products`, expectMin: 180 },
  { name: 'price_lists >= 5', query: `SELECT COUNT(*)::int AS n FROM price_lists`, expectMin: 5 },
  { name: 'price_list_items >= 800', query: `SELECT COUNT(*)::int AS n FROM price_list_items`, expectMin: 800 },
  { name: 'customers >= 180', query: `SELECT COUNT(*)::int AS n FROM customers`, expectMin: 180 },
  { name: 'contacts >= 100', query: `SELECT COUNT(*)::int AS n FROM contacts`, expectMin: 100 },
  { name: 'addresses >= 150', query: `SELECT COUNT(*)::int AS n FROM addresses`, expectMin: 150 },
  { name: 'suppliers >= 30', query: `SELECT COUNT(*)::int AS n FROM suppliers`, expectMin: 30 },
  { name: 'drivers >= 8', query: `SELECT COUNT(*)::int AS n FROM drivers`, expectMin: 8 },
  { name: 'vehicles >= 10', query: `SELECT COUNT(*)::int AS n FROM vehicles`, expectMin: 10 },
  { name: 'bank_accounts >= 5', query: `SELECT COUNT(*)::int AS n FROM bank_accounts`, expectMin: 5 },
  { name: 'stock rows >= 800', query: `SELECT COUNT(*)::int AS n FROM stock`, expectMin: 800 },
  { name: 'stock_movements >= 1500', query: `SELECT COUNT(*)::int AS n FROM stock_movements`, expectMin: 1500 },
  { name: 'orders >= 1800', query: `SELECT COUNT(*)::int AS n FROM orders`, expectMin: 1800 },
  { name: 'order_items >= 4000', query: `SELECT COUNT(*)::int AS n FROM order_items`, expectMin: 4000 },
  { name: 'invoices >= 1000', query: `SELECT COUNT(*)::int AS n FROM invoices`, expectMin: 1000 },
  { name: 'delivery_notes >= 500', query: `SELECT COUNT(*)::int AS n FROM delivery_notes`, expectMin: 500 },
  { name: 'payments >= 1000', query: `SELECT COUNT(*)::int AS n FROM payments`, expectMin: 1000 },
  { name: 'checks >= 180', query: `SELECT COUNT(*)::int AS n FROM checks`, expectMin: 180 },
  { name: 'purchase_orders >= 400', query: `SELECT COUNT(*)::int AS n FROM purchase_orders`, expectMin: 400 },
  { name: 'shipments >= 30', query: `SELECT COUNT(*)::int AS n FROM shipments`, expectMin: 30 },
  { name: 'cashbox_sessions >= 300', query: `SELECT COUNT(*)::int AS n FROM cashbox_sessions`, expectMin: 300 },
  { name: 'audit_events >= 2500', query: `SELECT COUNT(*)::int AS n FROM audit_events`, expectMin: 2500 },
  { name: 'no @demo.com users from old seed except new pattern', query: `SELECT COUNT(*)::int AS n FROM users WHERE email = 'carlos@demo.com'`, expectMax: 0 },
  {
    name: 'orders span > 20 months',
    query: `SELECT (EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / (30*24*3600))::int AS n FROM orders`,
    expectMin: 20,
  },
  {
    name: 'no completed order without invoice',
    query: `SELECT COUNT(*)::int AS n FROM orders o WHERE o.status = 'completed' AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.order_id::text = o.id::text AND i.status = 'issued')`,
    expectMax: 0,
  },
  // Fase 2
  { name: 'promotions >= 15', query: `SELECT COUNT(*)::int AS n FROM promotions`, expectMin: 15 },
  { name: 'promotion_items >= 30', query: `SELECT COUNT(*)::int AS n FROM promotion_items`, expectMin: 30 },
  { name: 'credit_notes >= 50', query: `SELECT COUNT(*)::int AS n FROM credit_notes`, expectMin: 50 },
  { name: 'credit_note_items >= 50', query: `SELECT COUNT(*)::int AS n FROM credit_note_items`, expectMin: 50 },
  { name: 'debit_notes >= 20', query: `SELECT COUNT(*)::int AS n FROM debit_notes`, expectMin: 20 },
  { name: 'debit_note_items >= 20', query: `SELECT COUNT(*)::int AS n FROM debit_note_items`, expectMin: 20 },
  { name: 'dispatch_sheets >= 100', query: `SELECT COUNT(*)::int AS n FROM dispatch_sheets`, expectMin: 100 },
  { name: 'picking_tasks >= 200', query: `SELECT COUNT(*)::int AS n FROM picking_tasks`, expectMin: 200 },
  { name: 'picking_task_items >= 400', query: `SELECT COUNT(*)::int AS n FROM picking_task_items`, expectMin: 400 },
  { name: 'commissions >= 800', query: `SELECT COUNT(*)::int AS n FROM commissions`, expectMin: 800 },
  // Fase 3
  { name: 'lots >= 80', query: `SELECT COUNT(*)::int AS n FROM lots`, expectMin: 80 },
  { name: 'stock_by_lot >= 80', query: `SELECT COUNT(*)::int AS n FROM stock_by_lot`, expectMin: 80 },
  { name: 'inventory_counts >= 10', query: `SELECT COUNT(*)::int AS n FROM inventory_counts`, expectMin: 10 },
  { name: 'inventory_count_lines >= 100', query: `SELECT COUNT(*)::int AS n FROM inventory_count_lines`, expectMin: 100 },
  { name: 'payment_batches >= 25', query: `SELECT COUNT(*)::int AS n FROM payment_batches`, expectMin: 25 },
  { name: 'payment_orders >= 50', query: `SELECT COUNT(*)::int AS n FROM payment_orders`, expectMin: 50 },
  { name: 'supplier_delivery_notes >= 250', query: `SELECT COUNT(*)::int AS n FROM supplier_delivery_notes`, expectMin: 250 },
  { name: 'supplier_claims >= 20', query: `SELECT COUNT(*)::int AS n FROM supplier_claims`, expectMin: 20 },
  { name: 'withholdings >= 120', query: `SELECT COUNT(*)::int AS n FROM withholdings`, expectMin: 120 },
  { name: 'return_orders >= 40', query: `SELECT COUNT(*)::int AS n FROM return_orders`, expectMin: 40 },
  { name: 'return_order_items >= 40', query: `SELECT COUNT(*)::int AS n FROM return_order_items`, expectMin: 40 },
  // Integrity checks
  {
    name: 'no picking items with deleted/missing product',
    query: `SELECT COUNT(*)::int AS n FROM picking_task_items pti WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id::text = pti.product_id::text AND p.deleted_at IS NULL)`,
    expectMax: 0,
  },
  {
    name: 'no picking tasks with missing order',
    query: `SELECT COUNT(*)::int AS n FROM picking_tasks pt WHERE pt.order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.id::text = pt.order_id::text)`,
    expectMax: 0,
  },
  {
    name: 'no commissions with missing order',
    query: `SELECT COUNT(*)::int AS n FROM commissions c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id::text = c.order_id::text)`,
    expectMax: 0,
  },
  {
    name: 'no picking tasks without items',
    query: `SELECT COUNT(*)::int AS n FROM picking_tasks pt WHERE NOT EXISTS (SELECT 1 FROM picking_task_items pti WHERE pti.picking_task_id::text = pt.id::text)`,
    expectMax: 0,
  },
];

async function run() {
  await AppDataSource.initialize();
  let pass = 0, fail = 0;
  for (const c of checks) {
    const rows = await AppDataSource.query(c.query);
    const n = Number(rows[0]?.n ?? 0);
    const okMin = c.expectMin === undefined || n >= c.expectMin;
    const okMax = c.expectMax === undefined || n <= c.expectMax;
    const okFn = !c.expect || c.expect(n);
    const ok = okMin && okMax && okFn;
    const bound = [
      c.expectMin !== undefined ? `min ${c.expectMin}` : null,
      c.expectMax !== undefined ? `max ${c.expectMax}` : null,
    ].filter(Boolean).join(', ');
    console.log(`${ok ? '  ✓' : '  ✗'} ${c.name.padEnd(55)} n=${String(n).padStart(7)}  (${bound})`);
    if (ok) pass++; else fail++;
  }
  console.log(`\n${pass}/${pass + fail} checks passed`);
  await AppDataSource.destroy();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Verify failed:', e);
  process.exit(1);
});
