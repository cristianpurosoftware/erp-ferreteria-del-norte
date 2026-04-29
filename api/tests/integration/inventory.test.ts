import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDb, resetDb } from './helpers/db';
import { seedBranch, seedWarehouse, seedProduct, seedCustomer, seedStock } from './helpers/fixtures';
import {
  createMovement,
  reserveForOrder,
  releaseReservation,
  markReservationsConsumed,
} from '../../src/modules/inventory/inventory.service';
import { AppDataSource } from '../../src/config/data-source';
import { StockEntity } from '../../src/modules/inventory/data_access/stock.entity';
import { StockReservationEntity } from '../../src/modules/inventory/data_access/stock-reservation.entity';

describe('inventory — transaction + race-safety', () => {
  beforeAll(async () => {
    await initDb();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('reserves stock: available -= qty, reserved += qty', async () => {
    const branch = await seedBranch();
    const wh = await seedWarehouse(branch.id);
    const product = await seedProduct();
    await seedStock(product.id, wh.id, 100);

    const orderId = '00000000-0000-0000-0000-000000000001';
    await reserveForOrder(orderId, [
      { productId: product.id, warehouseId: wh.id, quantity: 30 },
    ]);

    const stock = await AppDataSource.getRepository(StockEntity).findOne({
      where: { productId: product.id, warehouseId: wh.id },
    });
    expect(Number(stock!.availableQty)).toBe(70);
    expect(Number(stock!.reservedQty)).toBe(30);
  });

  it('BUG FIX — outbound after reserve consumes reservedQty, not availableQty', async () => {
    const branch = await seedBranch();
    const wh = await seedWarehouse(branch.id);
    const product = await seedProduct();
    await seedStock(product.id, wh.id, 100);

    const orderId = '00000000-0000-0000-0000-000000000002';
    await reserveForOrder(orderId, [
      { productId: product.id, warehouseId: wh.id, quantity: 30 },
    ]);

    // Dispatch / outbound referencing the order
    await createMovement({
      type: 'outbound',
      productId: product.id,
      sourceWarehouseId: wh.id,
      quantity: 30,
      referenceType: 'order',
      referenceId: orderId,
    });

    const stock = await AppDataSource.getRepository(StockEntity).findOne({
      where: { productId: product.id, warehouseId: wh.id },
    });
    // Expected: available stays at 70 (already deducted on reserve),
    // reserved goes back to 0 (goods really left). Before the fix, available
    // would be 40 (double-deduction) and reserved would stay at 30.
    expect(Number(stock!.availableQty)).toBe(70);
    expect(Number(stock!.reservedQty)).toBe(0);
  });

  it('outbound without reservation (POS sale) deducts from available', async () => {
    const branch = await seedBranch();
    const wh = await seedWarehouse(branch.id);
    const product = await seedProduct();
    await seedStock(product.id, wh.id, 100);

    await createMovement({
      type: 'outbound',
      productId: product.id,
      sourceWarehouseId: wh.id,
      quantity: 25,
    });

    const stock = await AppDataSource.getRepository(StockEntity).findOne({
      where: { productId: product.id, warehouseId: wh.id },
    });
    expect(Number(stock!.availableQty)).toBe(75);
    expect(Number(stock!.reservedQty)).toBe(0);
  });

  it('refuses outbound when available stock is insufficient', async () => {
    const branch = await seedBranch();
    const wh = await seedWarehouse(branch.id);
    const product = await seedProduct();
    await seedStock(product.id, wh.id, 5);

    await expect(
      createMovement({
        type: 'outbound',
        productId: product.id,
        sourceWarehouseId: wh.id,
        quantity: 20,
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });

  it('releaseReservation is idempotent — second call returns []', async () => {
    const branch = await seedBranch();
    const wh = await seedWarehouse(branch.id);
    const product = await seedProduct();
    await seedStock(product.id, wh.id, 100);

    const orderId = '00000000-0000-0000-0000-000000000003';
    await reserveForOrder(orderId, [
      { productId: product.id, warehouseId: wh.id, quantity: 10 },
    ]);

    const first = await releaseReservation(orderId);
    expect(first.length).toBe(1);

    const second = await releaseReservation(orderId);
    expect(second.length).toBe(0);

    const stock = await AppDataSource.getRepository(StockEntity).findOne({
      where: { productId: product.id, warehouseId: wh.id },
    });
    expect(Number(stock!.availableQty)).toBe(100);
    expect(Number(stock!.reservedQty)).toBe(0);
  });

  it('markReservationsConsumed flips active reservations to consumed (idempotent)', async () => {
    const branch = await seedBranch();
    const wh = await seedWarehouse(branch.id);
    const product = await seedProduct();
    await seedStock(product.id, wh.id, 50);

    const orderId = '00000000-0000-0000-0000-000000000004';
    await reserveForOrder(orderId, [
      { productId: product.id, warehouseId: wh.id, quantity: 10 },
    ]);

    const first = await markReservationsConsumed(orderId);
    expect(first.length).toBe(1);

    const second = await markReservationsConsumed(orderId);
    expect(second.length).toBe(0);

    const res = await AppDataSource.getRepository(StockReservationEntity).find({
      where: { orderId },
    });
    expect(res[0].status).toBe('consumed');
  });

  it('concurrent outbounds on same stock are serialized, never lost', async () => {
    const branch = await seedBranch();
    const wh = await seedWarehouse(branch.id);
    const product = await seedProduct();
    await seedStock(product.id, wh.id, 100);

    // Fire 10 outbounds of 5 units each in parallel. Under a lost-update bug
    // some would not persist. With pessimistic locks, each one commits.
    const ops = Array.from({ length: 10 }, () =>
      createMovement({
        type: 'outbound',
        productId: product.id,
        sourceWarehouseId: wh.id,
        quantity: 5,
      }),
    );
    await Promise.all(ops);

    const stock = await AppDataSource.getRepository(StockEntity).findOne({
      where: { productId: product.id, warehouseId: wh.id },
    });
    expect(Number(stock!.availableQty)).toBe(50);
  });

  it('refuses reservation when available stock is insufficient and rolls back partial state', async () => {
    const branch = await seedBranch();
    const wh = await seedWarehouse(branch.id);
    const p1 = await seedProduct({ name: 'p1' });
    const p2 = await seedProduct({ name: 'p2' });
    await seedStock(p1.id, wh.id, 100);
    await seedStock(p2.id, wh.id, 1); // not enough

    const orderId = '00000000-0000-0000-0000-000000000005';
    await expect(
      reserveForOrder(orderId, [
        { productId: p1.id, warehouseId: wh.id, quantity: 10 },
        { productId: p2.id, warehouseId: wh.id, quantity: 10 },
      ]),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });

    // Rollback: p1 should not have been reserved.
    const s1 = await AppDataSource.getRepository(StockEntity).findOne({
      where: { productId: p1.id, warehouseId: wh.id },
    });
    expect(Number(s1!.availableQty)).toBe(100);
    expect(Number(s1!.reservedQty)).toBe(0);

    const reservations = await AppDataSource.getRepository(StockReservationEntity).find({
      where: { orderId },
    });
    expect(reservations).toHaveLength(0);
  });
});
