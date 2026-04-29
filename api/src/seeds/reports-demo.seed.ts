/**
 * Demo seed for the advanced reports page.
 *
 * Creates just enough data so every report on /reportes/avanzados renders
 * something useful in local/demo environments:
 *
 * - Aged-debt buckets (0-30, 31-60, 61-90, 91+): AccountEntry rows with
 *   backdated `date` + status=pending on a sample of existing customers.
 * - Checks portfolio: third-party checks received from customers with
 *   future due dates, statuses received/in_portfolio/deposited so the
 *   "Cheques en cartera" and "Proyección de flujo de caja" reports both
 *   have inflows.
 * - Supplier invoices approved/matched with future due_date → "Proyección
 *   de flujo de caja" egresos.
 * - Three-way match fixtures: a handful of rows across matched / discrepancy
 *   / pending / overridden so "Conciliación 3 vías" is non-empty.
 *
 * Safety:
 *   - Prod requires explicit REPAIR_CONFIRM=yes.
 *   - Idempotent-ish: we only insert; running twice just duplicates demo
 *     rows. Safe for local, not safe for repeated prod use.
 *
 * Run:  npx ts-node src/seeds/reports-demo.seed.ts
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { AccountEntity } from '../modules/accounts/data_access/account.entity';
import { AccountEntryEntity } from '../modules/accounts/data_access/account-entry.entity';
import { CustomerEntity } from '../modules/customers/data_access/customer.entity';
import { SupplierEntity } from '../modules/suppliers/data_access/supplier.entity';
import { CheckEntity } from '../modules/checks/data_access/check.entity';
import { SupplierInvoiceEntity } from '../modules/supplier-invoices/data_access/supplier-invoice.entity';
import { ThreeWayMatchEntity } from '../modules/three-way-match/data_access/three-way-match.entity';
import { PurchaseOrderEntity } from '../modules/purchases/data_access/purchase-order.entity';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysAhead(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  if (env.NODE_ENV === 'production' && process.env.REPAIR_CONFIRM !== 'yes') {
    console.error('✖ Refusing to run in production without REPAIR_CONFIRM=yes.');
    process.exit(2);
  }

  await AppDataSource.initialize();
  console.log('DB connected');

  const customers = await AppDataSource.getRepository(CustomerEntity).find({ take: 200 });
  const suppliers = await AppDataSource.getRepository(SupplierEntity).find({ take: 50 });

  if (customers.length < 5) {
    console.error('✖ Need at least 5 customers in DB. Run the demo seed first.');
    process.exit(1);
  }
  if (suppliers.length < 3) {
    console.error('✖ Need at least 3 suppliers in DB. Run the demo seed first.');
    process.exit(1);
  }

  // ─── 1. Aged-debt buckets ────────────────────────────────────
  console.log('Seeding aged debt…');
  const accountRepo = AppDataSource.getRepository(AccountEntity);
  const entryRepo = AppDataSource.getRepository(AccountEntryEntity);

  // Buckets expressed as [minDaysAgo, maxDaysAgo, label]
  const bucketRanges: Array<[number, number, string]> = [
    [5, 25, '0-30'],
    [35, 55, '31-60'],
    [65, 85, '61-90'],
    [100, 160, '91+'],
  ];

  // Pick up to 15 distinct customers to spread debt across.
  const picked = customers.slice(0, Math.min(15, customers.length));
  let entriesCreated = 0;
  let totalDebt = 0;

  for (const c of picked) {
    let account = await accountRepo.findOne({ where: { entityType: 'customer', entityId: c.id } });
    if (!account) {
      account = accountRepo.create({ entityType: 'customer', entityId: c.id });
      account = await accountRepo.save(account);
    }

    // Give each customer 1–3 overdue debits spread across buckets.
    const count = randBetween(1, 3);
    for (let i = 0; i < count; i++) {
      const [minD, maxD] = pick(bucketRanges);
      const daysBack = randBetween(minD, maxD);
      const amount = randBetween(5_000, 80_000);
      const entry = entryRepo.create({
        accountId: account.id,
        type: 'debit',
        concept: `Factura vencida (demo) ${daysBack}d`,
        amount,
        status: 'pending',
        resultingBalance: 0, // not tracked here — aging report ignores it
        date: daysAgo(daysBack),
      } as Partial<AccountEntryEntity>);
      await entryRepo.save(entry);
      entriesCreated++;
      totalDebt += amount;
    }

    // Bump balances so customerDebt report also has fuel.
    account.currentBalance = (Number(account.currentBalance) + totalDebt / picked.length) as any;
    account.overdueBalance = (Number(account.overdueBalance) + totalDebt / picked.length) as any;
    await accountRepo.save(account);
  }
  console.log(`✓ ${entriesCreated} overdue account entries on ${picked.length} customers (~${totalDebt.toLocaleString('es-AR')} ARS)`);

  // ─── 2. Checks portfolio ─────────────────────────────────────
  console.log('Seeding checks…');
  const checkRepo = AppDataSource.getRepository(CheckEntity);
  const checkStatuses: Array<'received' | 'in_portfolio' | 'deposited'> = ['received', 'in_portfolio', 'deposited'];
  const banks = ['Banco Galicia', 'Santander', 'BBVA', 'Macro', 'Nación', 'Supervielle'];
  let checksCreated = 0;

  for (let i = 0; i < 25; i++) {
    const c = pick(customers);
    const due = daysAhead(randBetween(5, 120));
    const issue = daysAgo(randBetween(1, 15));
    const status = pick(checkStatuses);
    const check = checkRepo.create({
      number: String(randBetween(10_000_000, 99_999_999)),
      bankName: pick(banks),
      accountHolder: c.legalName,
      amount: randBetween(10_000, 500_000),
      issueDate: issue,
      dueDate: due,
      kind: Math.random() > 0.3 ? 'deferred' : 'common',
      ownOrThird: 'third',
      receivedFromCustomerId: c.id,
      status,
      cuit: c.taxId ?? null,
    } as Partial<CheckEntity>);
    await checkRepo.save(check);
    checksCreated++;
  }
  console.log(`✓ ${checksCreated} third-party checks created`);

  // ─── 3. Supplier invoices with future due dates ──────────────
  console.log('Seeding supplier invoices (future due)…');
  const siRepo = AppDataSource.getRepository(SupplierInvoiceEntity);
  const siStatuses: Array<'approved' | 'matched' | 'pending_approval'> = ['approved', 'matched', 'pending_approval'];
  let siCreated = 0;
  const createdSupplierInvoices: SupplierInvoiceEntity[] = [];
  for (let i = 0; i < 20; i++) {
    const s = pick(suppliers);
    const total = randBetween(20_000, 400_000);
    const subtotal = Math.round(total / 1.21);
    const taxes = total - subtotal;
    const si = siRepo.create({
      supplierId: s.id,
      supplierInvoiceNumber: `A-${String(randBetween(1000, 9999)).padStart(4, '0')}-${String(randBetween(10000000, 99999999))}`,
      invoiceType: 'A',
      salesPoint: '0001',
      issueDate: daysAgo(randBetween(1, 20)),
      receptionDate: daysAgo(randBetween(0, 5)),
      dueDate: daysAhead(randBetween(7, 90)),
      currency: 'ARS',
      subtotal,
      taxes,
      total,
      status: pick(siStatuses),
    } as Partial<SupplierInvoiceEntity>);
    const saved = await siRepo.save(si);
    createdSupplierInvoices.push(saved);
    siCreated++;
  }
  console.log(`✓ ${siCreated} supplier invoices created`);

  // ─── 4. Three-way match fixtures ─────────────────────────────
  console.log('Seeding three-way-match rows…');
  const twmRepo = AppDataSource.getRepository(ThreeWayMatchEntity);
  const poRepo = AppDataSource.getRepository(PurchaseOrderEntity);
  const twmStatuses = ['matched', 'matched', 'matched', 'discrepancy', 'discrepancy', 'pending', 'overridden'];

  // three_way_matches.purchase_order_id is NOT NULL — we need existing purchase
  // orders to link to. If none exist, skip the 3WM section and log a hint.
  const purchaseOrders = await poRepo.find({ take: createdSupplierInvoices.length });
  let twmCreated = 0;

  if (purchaseOrders.length === 0) {
    console.log('  (skipped — no purchase orders in DB; seed those first to get 3-way match data)');
  } else {
    for (const si of createdSupplierInvoices) {
      const po = pick(purchaseOrders);
      const status = pick(twmStatuses);
      const discrepancies =
        status === 'discrepancy'
          ? [{ kind: pick(['qty_mismatch', 'price_mismatch', 'missing_receipt']), detail: 'Diferencia detectada (demo)' }]
          : null;
      const twm = twmRepo.create({
        supplierInvoiceId: si.id,
        purchaseOrderId: po.id,
        status,
        discrepancies,
      } as Partial<ThreeWayMatchEntity>);
      await twmRepo.save(twm);
      twmCreated++;
    }
    console.log(`✓ ${twmCreated} three-way match rows created`);
  }

  await AppDataSource.destroy();
  console.log('');
  console.log('Done. Refresh /reportes/avanzados to see data.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
