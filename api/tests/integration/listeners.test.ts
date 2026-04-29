import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDb, resetDb } from './helpers/db';
import { seedCustomer } from './helpers/fixtures';
import eventBus from '../../src/common/event-bus';
import { registerInvoiceListeners } from '../../src/modules/invoices/invoices.listeners';
import { registerPaymentListeners } from '../../src/modules/payments/payments.listeners';
import { InvoiceEvents } from '../../src/modules/invoices/invoices.events';
import { PaymentEvents } from '../../src/modules/payments/payments.events';
import { AppDataSource } from '../../src/config/data-source';
import { AccountEntity } from '../../src/modules/accounts/data_access/account.entity';
import { AccountEntryEntity } from '../../src/modules/accounts/data_access/account-entry.entity';

// These listeners rely on fire-and-forget; we need a helper that waits
// for the async handler (scheduled with .catch) to actually commit.
async function flushListeners() {
  // One tick for handler scheduling, another for the transaction to commit.
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setTimeout(r, 50));
}

describe('deuda↔cobranza listeners', () => {
  beforeAll(async () => {
    await initDb();
    registerInvoiceListeners();
    registerPaymentListeners();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('invoice.accepted → debit entry in customer account', async () => {
    const customer = await seedCustomer();
    const invoiceId = '22222222-2222-2222-2222-222222222222';

    eventBus.emit(InvoiceEvents.ACCEPTED, {
      id: invoiceId,
      customerId: customer.id,
      total: 1500,
      number: 'A-0001',
    } as any);
    await flushListeners();

    const account = await AppDataSource.getRepository(AccountEntity).findOne({
      where: { entityType: 'customer', entityId: customer.id },
    });
    expect(Number(account!.currentBalance)).toBe(1500);

    const entries = await AppDataSource.getRepository(AccountEntryEntity).find({
      where: { accountId: account!.id },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].referenceType).toBe('invoice');
    expect(entries[0].referenceId).toBe(invoiceId);
  });

  it('invoice.accepted + invoice.issued for same id does not double-post', async () => {
    const customer = await seedCustomer();
    const invoiceId = '33333333-3333-3333-3333-333333333333';

    // Simulate a tenant that fires both events (AFIP then local).
    eventBus.emit(InvoiceEvents.ACCEPTED, {
      id: invoiceId, customerId: customer.id, total: 1000, number: 'A-0002',
    } as any);
    await flushListeners();
    eventBus.emit(InvoiceEvents.ISSUED, {
      id: invoiceId, customerId: customer.id, total: 1000, number: 'A-0002',
    } as any);
    await flushListeners();

    const account = await AppDataSource.getRepository(AccountEntity).findOne({
      where: { entityType: 'customer', entityId: customer.id },
    });
    expect(Number(account!.currentBalance)).toBe(1000);

    const entries = await AppDataSource.getRepository(AccountEntryEntity).find({
      where: { accountId: account!.id },
    });
    expect(entries).toHaveLength(1);
  });

  it('payment.applied direction=in → credit entry in customer account', async () => {
    const customer = await seedCustomer();
    const paymentId = '44444444-4444-4444-4444-444444444444';

    // Start with debt so we can verify it goes down.
    eventBus.emit(InvoiceEvents.ACCEPTED, {
      id: '55555555-5555-5555-5555-555555555555',
      customerId: customer.id, total: 2000, number: 'A-0003',
    } as any);
    await flushListeners();

    eventBus.emit(PaymentEvents.APPLIED, {
      id: paymentId,
      customerId: customer.id,
      direction: 'in',
      amount: 800,
      paymentMethod: 'cash',
    } as any);
    await flushListeners();

    const account = await AppDataSource.getRepository(AccountEntity).findOne({
      where: { entityType: 'customer', entityId: customer.id },
    });
    expect(Number(account!.currentBalance)).toBe(1200);

    const entries = await AppDataSource.getRepository(AccountEntryEntity).find({
      where: { accountId: account!.id },
    });
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.type === 'credit')?.referenceId).toBe(paymentId);
  });

  it('same payment applied twice does not double-credit', async () => {
    const customer = await seedCustomer();
    const paymentId = '66666666-6666-6666-6666-666666666666';

    for (let i = 0; i < 2; i++) {
      eventBus.emit(PaymentEvents.APPLIED, {
        id: paymentId,
        customerId: customer.id,
        direction: 'in',
        amount: 500,
        paymentMethod: 'cash',
      } as any);
      await flushListeners();
    }

    const account = await AppDataSource.getRepository(AccountEntity).findOne({
      where: { entityType: 'customer', entityId: customer.id },
    });
    expect(Number(account!.currentBalance)).toBe(-500); // credit only applied once
    const entries = await AppDataSource.getRepository(AccountEntryEntity).find({
      where: { accountId: account!.id },
    });
    expect(entries).toHaveLength(1);
  });
});
