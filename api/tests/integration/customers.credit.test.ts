import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDb, resetDb } from './helpers/db';
import { seedCustomer } from './helpers/fixtures';
import { checkCredit } from '../../src/modules/customers/customers.service';
import { createEntry } from '../../src/modules/accounts/accounts.service';
import { AppDataSource } from '../../src/config/data-source';
import { OrderEntity } from '../../src/modules/orders/data_access/order.entity';

describe('customers — checkCredit with in-flight orders', () => {
  beforeAll(async () => {
    await initDb();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('allows an order within limit when no debt, no in-flight', async () => {
    const customer = await seedCustomer({
      creditLimit: 5000,
      creditPolicy: 'strict',
    });
    const result = await checkCredit(customer.id, 1000);
    expect(result.ok).toBe(true);
  });

  it('blocks when creditPolicy=blocked regardless of amounts', async () => {
    const customer = await seedCustomer({
      creditLimit: 5000,
      creditPolicy: 'blocked',
    });
    const result = await checkCredit(customer.id, 1);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('policy_blocked');
  });

  it('blocks when over credit limit counting current balance only', async () => {
    const customer = await seedCustomer({
      creditLimit: 1000,
      creditPolicy: 'strict',
    });
    await createEntry({
      entityType: 'customer',
      entityId: customer.id,
      type: 'debit',
      concept: 'Existing debt',
      amount: 800,
    });

    const result = await checkCredit(customer.id, 300);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('over_credit_limit');
  });

  it('aggregates in-flight orders (confirmed..dispatched) into the check', async () => {
    const customer = await seedCustomer({
      creditLimit: 1000,
      creditPolicy: 'strict',
    });
    // No debt in account yet, but two confirmed orders are eating credit.
    const orderRepo = AppDataSource.getRepository(OrderEntity);
    await orderRepo.save(
      orderRepo.create({
        customerId: customer.id,
        status: 'confirmed',
        subtotal: 400,
        taxes: 0,
        discounts: 0,
        total: 400,
      }),
    );
    await orderRepo.save(
      orderRepo.create({
        customerId: customer.id,
        status: 'stock_reserved',
        subtotal: 400,
        taxes: 0,
        discounts: 0,
        total: 400,
      }),
    );

    // Customer has 800 committed in orders. Attempting a 300 one should block.
    const blocked = await checkCredit(customer.id, 300);
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toBe('over_credit_limit');
    expect((blocked.detail as any)?.inFlightTotal).toBe(800);

    // A smaller one should pass.
    const ok = await checkCredit(customer.id, 100);
    expect(ok.ok).toBe(true);
  });

  it('ignores draft and completed orders in the in-flight total', async () => {
    const customer = await seedCustomer({
      creditLimit: 1000,
      creditPolicy: 'strict',
    });
    const orderRepo = AppDataSource.getRepository(OrderEntity);
    await orderRepo.save(
      orderRepo.create({
        customerId: customer.id,
        status: 'draft',
        subtotal: 500, taxes: 0, discounts: 0, total: 500,
      }),
    );
    await orderRepo.save(
      orderRepo.create({
        customerId: customer.id,
        status: 'completed',
        subtotal: 500, taxes: 0, discounts: 0, total: 500,
      }),
    );

    const result = await checkCredit(customer.id, 500);
    expect(result.ok).toBe(true);
  });

  it('blocks on overdue when blockOnOverdue is true', async () => {
    const customer = await seedCustomer({
      creditLimit: 10_000,
      creditPolicy: 'normal',
      blockOnOverdue: true,
    });
    // Manually set overdueBalance on the account.
    await createEntry({
      entityType: 'customer',
      entityId: customer.id,
      type: 'debit',
      concept: 'Old debt',
      amount: 100,
    });
    await AppDataSource.query(
      `UPDATE accounts SET overdue_balance = 100 WHERE entity_type='customer' AND entity_id=$1`,
      [customer.id],
    );

    const result = await checkCredit(customer.id, 50);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('overdue_balance');
  });
});
