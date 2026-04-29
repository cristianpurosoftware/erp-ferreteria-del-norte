import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';

const BRANCH_CODE = process.env.DEMO_BRANCH_CODE;

async function cleanupBranch() {
  if (!BRANCH_CODE) {
    console.error('DEMO_BRANCH_CODE is required. Ej: DEMO_BRANCH_CODE=DEMO-ACME npm run seed:cleanup-branch');
    process.exit(1);
  }

  if (BRANCH_CODE === 'CASA-CENTRAL') {
    console.error('No se puede eliminar CASA-CENTRAL.');
    process.exit(1);
  }

  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();

  try {
    const rows = await qr.query(`SELECT id FROM branches WHERE code = $1`, [BRANCH_CODE]);
    if (rows.length === 0) {
      console.log(`Branch "${BRANCH_CODE}" no encontrada. Nada que limpiar.`);
      process.exit(0);
    }
    const branchId: string = rows[0].id;

    // Warehouses of this branch
    const whRows = await qr.query(`SELECT id FROM warehouses WHERE branch_id = $1`, [branchId]);
    const whIds: string[] = whRows.map((r: any) => r.id);

    if (whIds.length > 0) {
      const whList = whIds.map((_, i) => `$${i + 1}`).join(', ');

      // Stock movements and stock
      await qr.query(`DELETE FROM stock_movements WHERE source_warehouse_id IN (${whList}) OR dest_warehouse_id IN (${whList})`, whIds);
      await qr.query(`DELETE FROM stock WHERE warehouse_id IN (${whList})`, whIds);
      await qr.query(`DELETE FROM warehouse_locations WHERE warehouse_id IN (${whList})`, whIds);
    }

    // Orders of this branch + cascade
    const orderRows = await qr.query(`SELECT id FROM orders WHERE branch_id = $1`, [branchId]);
    const orderIds: string[] = orderRows.map((r: any) => r.id);
    if (orderIds.length > 0) {
      const oList = orderIds.map((_, i) => `$${i + 1}`).join(', ');
      await qr.query(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id IN (${oList}))`, orderIds);
      await qr.query(`DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id IN (${oList}))`, orderIds);
      await qr.query(`DELETE FROM invoices WHERE order_id IN (${oList})`, orderIds);
      await qr.query(`DELETE FROM order_items WHERE order_id IN (${oList})`, orderIds);
      await qr.query(`DELETE FROM orders WHERE id IN (${oList})`, orderIds);
    }

    // Cashbox sessions + cashboxes of this branch
    const cbRows = await qr.query(`SELECT id FROM cashboxes WHERE branch_id = $1`, [branchId]);
    const cbIds: string[] = cbRows.map((r: any) => r.id);
    if (cbIds.length > 0) {
      const cbList = cbIds.map((_, i) => `$${i + 1}`).join(', ');
      await qr.query(`DELETE FROM cashbox_sessions WHERE cashbox_id IN (${cbList})`, cbIds);
      await qr.query(`DELETE FROM cashboxes WHERE id IN (${cbList})`, cbIds);
    }

    // Warehouses
    if (whIds.length > 0) {
      const whList = whIds.map((_, i) => `$${i + 1}`).join(', ');
      await qr.query(`DELETE FROM warehouses WHERE id IN (${whList})`, whIds);
    }

    // Customers tagged with this branch in metadata
    const custRows = await qr.query(
      `SELECT id FROM customers WHERE metadata->>'demo_branch' = $1`,
      [BRANCH_CODE],
    );
    if (custRows.length > 0) {
      const custIds: string[] = custRows.map((r: any) => r.id);
      const cList = custIds.map((_, i) => `$${i + 1}`).join(', ');
      await qr.query(`DELETE FROM contacts WHERE customer_id IN (${cList})`, custIds);
      await qr.query(`DELETE FROM addresses WHERE customer_id IN (${cList})`, custIds);
      await qr.query(`DELETE FROM customers WHERE id IN (${cList})`, custIds);
    }

    // Branch itself
    await qr.query(`DELETE FROM branches WHERE id = $1`, [branchId]);

    console.log(`Branch "${BRANCH_CODE}" eliminada correctamente.`);
    console.log(`  Pedidos eliminados: ${orderIds.length}`);
    console.log(`  Depósitos eliminados: ${whIds.length}`);
    console.log(`  Clientes demo eliminados: ${custRows.length}`);
  } finally {
    await qr.release();
  }

  process.exit(0);
}

cleanupBranch().catch((err) => { console.error(err); process.exit(1); });
