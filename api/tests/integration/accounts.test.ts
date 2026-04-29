import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDb, resetDb } from './helpers/db';
import { seedCustomer } from './helpers/fixtures';
import { createEntry, createEntryIdempotent } from '../../src/modules/accounts/accounts.service';
import { AppDataSource } from '../../src/config/data-source';
import { AccountEntity } from '../../src/modules/accounts/data_access/account.entity';
import { AccountEntryEntity } from '../../src/modules/accounts/data_access/account-entry.entity';

describe('accounts — transaction + idempotency', () => {
  beforeAll(async () => {
    await initDb();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('creates the account lazily on first entry', async () => {
    const customer = await seedCustomer();
    await createEntry({
      entityType: 'customer',
      entityId: customer.id,
      type: 'debit',
      concept: 'Test debit',
      amount: 500,
    });

    const account = await AppDataSource.getRepository(AccountEntity).findOne({
      where: { entityType: 'customer', entityId: customer.id },
    });
    expect(account).toBeTruthy();
    expect(Number(account!.currentBalance)).toBe(500);
  });

  it('debit adds to balance, credit subtracts', async () => {
    const customer = await seedCustomer();
    await createEntry({
      entityType: 'customer', entityId: customer.id, type: 'debit',
      concept: 'A', amount: 1000,
    });
    await createEntry({
      entityType: 'customer', entityId: customer.id, type: 'credit',
      concept: 'B', amount: 300,
    });

    const account = await AppDataSource.getRepository(AccountEntity).findOne({
      where: { entityType: 'customer', entityId: customer.id },
    });
    expect(Number(account!.currentBalance)).toBe(700);
  });

  it('concurrent entries never lose money (pessimistic lock)', async () => {
    const customer = await seedCustomer();

    const ops = Array.from({ length: 20 }, (_, i) =>
      createEntry({
        entityType: 'customer',
        entityId: customer.id,
        type: 'debit',
        concept: `Concurrent debit ${i}`,
        amount: 10,
      }),
    );
    await Promise.all(ops);

    const account = await AppDataSource.getRepository(AccountEntity).findOne({
      where: { entityType: 'customer', entityId: customer.id },
    });
    expect(Number(account!.currentBalance)).toBe(200);

    const entries = await AppDataSource.getRepository(AccountEntryEntity).find({
      where: { accountId: account!.id },
    });
    expect(entries).toHaveLength(20);
  });

  it('createEntryIdempotent dedupes by (referenceType, referenceId)', async () => {
    const customer = await seedCustomer();

    const refId = '11111111-1111-1111-1111-111111111111';
    const first = await createEntryIdempotent({
      entityType: 'customer',
      entityId: customer.id,
      type: 'debit',
      concept: 'Invoice 1',
      amount: 500,
      referenceType: 'invoice',
      referenceId: refId,
    });

    const second = await createEntryIdempotent({
      entityType: 'customer',
      entityId: customer.id,
      type: 'debit',
      concept: 'Invoice 1 — duplicate fire',
      amount: 500,
      referenceType: 'invoice',
      referenceId: refId,
    });

    expect(second.id).toBe(first.id);

    const account = await AppDataSource.getRepository(AccountEntity).findOne({
      where: { entityType: 'customer', entityId: customer.id },
    });
    expect(Number(account!.currentBalance)).toBe(500);

    const entries = await AppDataSource.getRepository(AccountEntryEntity).find({
      where: { accountId: account!.id },
    });
    expect(entries).toHaveLength(1);
  });
});
