/**
 * Repair seed for demo/local only.
 *
 * Problem: `order_items.product_id` references products that no longer exist
 * (orphan FKs) because the catalog was reseeded but orders were not. As a
 * result, `/reports/top-products` returns few or zero rows since the INNER
 * JOIN against `products` drops everything.
 *
 * Fix: truncate `order_items` and `orders` and reseed 60–120 orders spread
 * across the last 30 days using only products currently alive in the catalog.
 *
 * Safety:
 *  - Production is blocked unless `REPAIR_CONFIRM=yes` is set explicitly.
 *  - Only touches `orders` and `order_items`. Does not touch catalog, stock,
 *    accounts, payments, invoices, price lists, or users.
 *
 * Run:  REPAIR_CONFIRM=yes npx ts-node src/seeds/repair-top-products-demo.seed.ts
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { OrderEntity } from '../modules/orders/data_access/order.entity';
import { OrderItemEntity } from '../modules/orders/data_access/order-item.entity';
import { CustomerEntity } from '../modules/customers/data_access/customer.entity';
import { ProductEntity } from '../modules/products/data_access/product.entity';
import { UserEntity } from '../modules/users/data_access/user.entity';
import { BranchEntity } from '../modules/branches/data_access/branch.entity';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  // Prod guard: env.NODE_ENV === 'production' requires explicit override.
  if (env.NODE_ENV === 'production' && process.env.REPAIR_CONFIRM !== 'yes') {
    console.error('✖ Refusing to run in production without REPAIR_CONFIRM=yes.');
    process.exit(2);
  }

  await AppDataSource.initialize();
  console.log('DB connected');

  // ─── Preflight ───────────────────────────────────────────────
  const products = await AppDataSource.getRepository(ProductEntity).find();
  const customers = await AppDataSource.getRepository(CustomerEntity).find({ take: 500 });
  const users = await AppDataSource.getRepository(UserEntity).find({ take: 50 });
  const branch = await AppDataSource.getRepository(BranchEntity).findOne({ where: {} });

  console.log(`Preflight: ${products.length} live products, ${customers.length} live customers.`);

  if (products.length < 5) {
    console.error('✖ Need at least 5 live products. Seed the catalog first.');
    process.exit(1);
  }
  if (customers.length < 5) {
    console.error('✖ Need at least 5 live customers. Seed demo data first.');
    process.exit(1);
  }

  // ─── Wipe orders + items (demo only) ─────────────────────────
  console.log('Truncating orders + order_items (CASCADE)…');
  await AppDataSource.query('TRUNCATE TABLE order_items, orders CASCADE');

  // ─── Generate orders ─────────────────────────────────────────
  // Mix of statuses — only the ones NOT IN (draft, cancelled, rejected)
  // contribute to Top Products, so keep the demo heavy on those.
  const statuses = [
    'pending_confirmation', 'pending_confirmation',
    'confirmed', 'confirmed', 'confirmed',
    'stock_reserved',
    'in_preparation',
    'dispatched',
    'delivered', 'delivered',
    'completed', 'completed', 'completed',
    'draft',       // some drafts to keep realism
    'cancelled',   // a few to exercise the filter
  ];
  const channels = ['manual', 'manual', 'manual', 'portal', 'whatsapp'];
  const notes = [
    'Cliente solicita entrega urgente',
    'Verificar stock antes de confirmar',
    'Pedido recurrente semanal',
    null, null,
    'Coordinar con depósito central',
    null, null,
  ];

  const orderRepo = AppDataSource.getRepository(OrderEntity);
  const orderCount = randomBetween(80, 120);
  const now = new Date();

  // Guarantee at least 5 distinct "hot" products get sales in included
  // statuses. These get used more often than the rest so the Top 5 is stable.
  const hotProducts = [...products]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(8, products.length));

  const orders: OrderEntity[] = [];
  for (let i = 0; i < orderCount; i++) {
    const customer = pick(customers);
    const seller = users.length > 0 ? pick(users) : null;
    const numItems = randomBetween(1, 5);

    // 60% chance an item is one of the hot products, 40% any product.
    const selectedProducts: ProductEntity[] = [];
    for (let j = 0; j < numItems; j++) {
      selectedProducts.push(Math.random() < 0.6 ? pick(hotProducts) : pick(products));
    }

    const items: Partial<OrderItemEntity>[] = selectedProducts.map((p) => {
      const qty = randomBetween(1, 20);
      const unitPrice = Number(p.basePrice) || randomBetween(500, 5000);
      const discount = Math.random() > 0.7 ? +(unitPrice * qty * 0.05).toFixed(2) : 0;
      const tax = +(unitPrice * qty * 0.21).toFixed(2);
      const subtotal = +(unitPrice * qty - discount).toFixed(2);
      return { productId: p.id, quantity: qty, unitPrice, discount, tax, subtotal };
    });

    const subtotal = items.reduce((s, it) => s + (it.subtotal ?? 0), 0);
    const taxes = items.reduce((s, it) => s + (it.tax ?? 0), 0);
    const discounts = items.reduce((s, it) => s + (it.discount ?? 0), 0);
    const total = +(subtotal + taxes).toFixed(2);

    // First ~20% of orders are today; rest spread 1–30 days back.
    const todayShare = Math.max(1, Math.floor(orderCount * 0.2));
    const daysAgo = i < todayShare ? 0 : randomBetween(1, 30);
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - daysAgo);
    orderDate.setHours(randomBetween(8, 20), randomBetween(0, 59), randomBetween(0, 59));

    const order = orderRepo.create({
      customerId: customer.id,
      sellerId: seller?.id ?? null,
      branchId: branch?.id ?? null,
      // Inherit zoneId/routeId from the customer so `sales-by-zone`
      // and route-based reports have data to show.
      zoneId: customer.zoneId ?? null,
      routeId: customer.routeId ?? null,
      channel: pick(channels),
      status: pick(statuses),
      subtotal,
      taxes,
      discounts,
      total,
      notes: pick(notes),
      items: items as OrderItemEntity[],
    } as Partial<OrderEntity>);
    (order as any).createdAt = orderDate;

    orders.push(order);
  }

  const saved = await orderRepo.save(orders);

  // ─── Report ──────────────────────────────────────────────────
  const byStatus: Record<string, number> = {};
  for (const o of saved) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

  console.log(`✓ ${saved.length} orders created (${orderCount} requested).`);
  console.log('Por estado:', byStatus);

  // Sanity check: how many order_items now resolve to live products?
  const { matching }: { matching: string } = (await AppDataSource.query(`
    SELECT COUNT(*)::text AS matching
    FROM order_items oi
    INNER JOIN products p ON p.id::text = oi.product_id::text
    WHERE oi.deleted_at IS NULL AND p.deleted_at IS NULL
  `))[0];
  console.log(`order_items matching live products: ${matching}`);

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
