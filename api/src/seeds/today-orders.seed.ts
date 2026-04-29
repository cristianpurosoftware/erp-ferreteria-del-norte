import { AppDataSource } from '../config/data-source';
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
  await AppDataSource.initialize();
  console.log('DB connected');

  const customers = await AppDataSource.getRepository(CustomerEntity).find({ take: 100 });
  const products = await AppDataSource.getRepository(ProductEntity).find({ take: 100 });
  const users = await AppDataSource.getRepository(UserEntity).find({ take: 100 });
  const branch = await AppDataSource.getRepository(BranchEntity).findOne({ where: {} });

  if (customers.length === 0 || products.length === 0) {
    console.error('No hay clientes o productos. Corre el seed demo primero.');
    process.exit(1);
  }

  const orderRepo = AppDataSource.getRepository(OrderEntity);

  const statuses = [
    'draft', 'draft',
    'pending_confirmation', 'pending_confirmation', 'pending_confirmation',
    'confirmed', 'confirmed',
    'stock_reserved',
    'dispatched',
    'delivered',
    'completed', 'completed',
  ];

  const channels = ['manual', 'manual', 'manual', 'portal', 'whatsapp'];

  const notes = [
    'Cliente solicita entrega urgente',
    'Verificar stock antes de confirmar',
    'Pedido recurrente semanal',
    null,
    null,
    'Coordinar con depósito central',
    'Descuento especial aprobado por gerencia',
    null,
    'Cliente retira en sucursal',
    null,
  ];

  const now = new Date();
  const todayOrders: OrderEntity[] = [];

  // Generate orders spread across last 30 days + today
  for (let i = 0; i < 40; i++) {
    const customer = pick(customers);
    const seller = users.length > 0 ? pick(users) : null;
    const numItems = randomBetween(1, 5);
    const selectedProducts = [];
    for (let j = 0; j < numItems; j++) {
      selectedProducts.push(pick(products));
    }

    const items: Partial<OrderItemEntity>[] = selectedProducts.map((p) => {
      const qty = randomBetween(1, 20);
      const unitPrice = Number(p.basePrice) || randomBetween(500, 5000);
      const discount = Math.random() > 0.7 ? +(unitPrice * qty * 0.05).toFixed(2) : 0;
      const tax = +(unitPrice * qty * 0.21).toFixed(2);
      const subtotal = +(unitPrice * qty - discount).toFixed(2);
      return {
        productId: p.id,
        quantity: qty,
        unitPrice,
        discount,
        tax,
        subtotal,
      };
    });

    const subtotal = items.reduce((s, it) => s + (it.subtotal ?? 0), 0);
    const taxes = items.reduce((s, it) => s + (it.tax ?? 0), 0);
    const discounts = items.reduce((s, it) => s + (it.discount ?? 0), 0);
    const total = +(subtotal + taxes).toFixed(2);

    // Spread orders across last 30 days
    const daysAgo = i < 12 ? 0 : randomBetween(1, 30); // 12 for today, rest spread
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - daysAgo);
    orderDate.setHours(randomBetween(8, 20), randomBetween(0, 59), randomBetween(0, 59));

    const order = orderRepo.create({
      customerId: customer.id,
      sellerId: seller?.id ?? null,
      branchId: branch?.id ?? null,
      channel: pick(channels),
      status: pick(statuses),
      subtotal,
      taxes,
      discounts,
      total,
      notes: pick(notes),
      items: items as OrderItemEntity[],
    } as Partial<OrderEntity>);

    // Override createdAt to be today
    (order as any).createdAt = orderDate;

    todayOrders.push(order);
  }

  const saved = await orderRepo.save(todayOrders as unknown as OrderEntity[]);
  console.log(`✓ ${saved.length} pedidos creados para hoy`);

  // Log summary
  const statusCounts: Record<string, number> = {};
  for (const o of saved) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }
  console.log('Por estado:', statusCounts);

  const totalAmount = saved.reduce((s, o) => s + Number(o.total), 0);
  console.log(`Monto total: $${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
