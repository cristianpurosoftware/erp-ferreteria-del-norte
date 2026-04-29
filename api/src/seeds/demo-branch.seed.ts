import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { BranchEntity } from '../modules/branches/data_access/branch.entity';
import { WarehouseEntity } from '../modules/warehouses/data_access/warehouse.entity';
import { WarehouseLocationEntity } from '../modules/warehouse-locations/data_access/warehouse-location.entity';
import { CashboxEntity } from '../modules/cashbox/data_access/cashbox.entity';
import { CustomerEntity } from '../modules/customers/data_access/customer.entity';
import { ContactEntity } from '../modules/customers/data_access/contact.entity';
import { AddressEntity } from '../modules/customers/data_access/address.entity';
import { OrderEntity } from '../modules/orders/data_access/order.entity';
import { OrderItemEntity } from '../modules/orders/data_access/order-item.entity';
import { InvoiceEntity } from '../modules/invoices/data_access/invoice.entity';
import { PaymentEntity } from '../modules/payments/data_access/payment.entity';
import { ProductEntity } from '../modules/products/data_access/product.entity';
import { PriceListEntity } from '../modules/price-lists/data_access/price-list.entity';
import { StockEntity } from '../modules/inventory/data_access/stock.entity';
import { InvoiceTypeEntity } from '../modules/invoice-types/data_access/invoice-type.entity';
import { CompanyEntity } from '../modules/company/data_access/company.entity';
import { SalesZoneEntity } from '../modules/sales-zones/data_access/sales-zone.entity';
import { RouteEntity } from '../modules/routes/data_access/route.entity';
import { fk, daysAgo, daysFromNow, randomBetween, pick, pickMany, weighted, generateCuit, chunk } from './demo/_helpers';

async function save1<T extends object>(
  repo: { save: (e: any) => Promise<any>; create: (e: any) => any },
  partial: object,
): Promise<T> {
  return (await repo.save(repo.create(partial))) as unknown as T;
}

const BRANCH_CODE = process.env.DEMO_BRANCH_CODE;
const BRANCH_NAME = process.env.DEMO_BRANCH_NAME;
const ORDER_COUNT = parseInt(process.env.DEMO_BRANCH_ORDERS || '50', 10);

async function seedDemoBranch() {
  if (!BRANCH_CODE || !BRANCH_NAME) {
    console.error('DEMO_BRANCH_CODE and DEMO_BRANCH_NAME are required.');
    process.exit(1);
  }

  await AppDataSource.initialize();

  const branchRepo = AppDataSource.getRepository(BranchEntity);
  const warehouseRepo = AppDataSource.getRepository(WarehouseEntity);
  const locationRepo = AppDataSource.getRepository(WarehouseLocationEntity);
  const cashboxRepo = AppDataSource.getRepository(CashboxEntity);
  const customerRepo = AppDataSource.getRepository(CustomerEntity);
  const contactRepo = AppDataSource.getRepository(ContactEntity);
  const addressRepo = AppDataSource.getRepository(AddressEntity);
  const orderRepo = AppDataSource.getRepository(OrderEntity);
  const orderItemRepo = AppDataSource.getRepository(OrderItemEntity);
  const invoiceRepo = AppDataSource.getRepository(InvoiceEntity);
  const paymentRepo = AppDataSource.getRepository(PaymentEntity);
  const productRepo = AppDataSource.getRepository(ProductEntity);
  const priceListRepo = AppDataSource.getRepository(PriceListEntity);
  const stockRepo = AppDataSource.getRepository(StockEntity);
  const invoiceTypeRepo = AppDataSource.getRepository(InvoiceTypeEntity);
  const companyRepo = AppDataSource.getRepository(CompanyEntity);
  const zoneRepo = AppDataSource.getRepository(SalesZoneEntity);
  const routeRepo = AppDataSource.getRepository(RouteEntity);

  // ── Prerequisitos ──────────────────────────────────────────────
  const existing = await branchRepo.findOneBy({ code: BRANCH_CODE });
  if (existing) {
    console.error(`Branch ${BRANCH_CODE} ya existe. Usá DEMO_BRANCH_CODE=DEMO-ACME npm run seed:cleanup-branch primero.`);
    process.exit(1);
  }

  const company = await companyRepo.findOne({ where: {} });
  if (!company) throw new Error('No hay company. Correr seed principal primero.');

  const products = await productRepo.find({ where: { status: 'active' } });
  if (products.length === 0) throw new Error('No hay productos activos. Correr seed:full primero.');

  const priceLists = await priceListRepo.find({ where: { status: 'active' } });
  const invoiceTypeA = await invoiceTypeRepo.findOneBy({ code: 'FA' });
  const invoiceTypeB = await invoiceTypeRepo.findOneBy({ code: 'FB' });
  const zones = await zoneRepo.find();
  const routes = await routeRepo.find();

  // ── 1. Branch ──────────────────────────────────────────────────
  const branch = await save1<BranchEntity>(branchRepo, {
    company_id: company.id, code: BRANCH_CODE, name: BRANCH_NAME, status: 'active',
  });
  console.log(`  [1] Branch creada: ${BRANCH_NAME} (${BRANCH_CODE}) — id: ${branch.id}`);

  // ── 2. Depósito + ubicaciones ──────────────────────────────────
  const warehouse = await save1<WarehouseEntity>(warehouseRepo, {
    branchId: branch.id, name: `Depósito ${BRANCH_NAME}`, type: 'physical', status: 'active',
  });

  const locationDefs = [
    { code: 'PICKING-A', kind: 'pick' },
    { code: 'STAGING-01', kind: 'staging' },
    { code: 'DEVOLUCIONES', kind: 'returns' },
    { code: 'BULK-01', kind: 'bulk' },
  ];
  for (const loc of locationDefs) {
    await save1<WarehouseLocationEntity>(locationRepo, { warehouseId: warehouse.id, ...loc, status: 'active' });
  }
  console.log(`  [2] Depósito y ${locationDefs.length} ubicaciones creadas`);

  // ── 3. Stock en nuevo depósito (subset de 200 productos) ────────
  const subset = products.slice(0, Math.min(200, products.length));
  const stockRows: Partial<StockEntity>[] = subset.map((p) => ({
    productId: p.id,
    variantId: null,
    warehouseId: warehouse.id,
    availableQty: randomBetween(20, 500),
    reservedQty: 0,
    inTransitQty: 0,
    minStock: Number(p.minStock),
  }));
  for (const batch of chunk(stockRows, 200)) {
    await stockRepo.insert(batch as any[]);
  }
  console.log(`  [3] Stock inicial: ${stockRows.length} productos en depósito`);

  // ── 4. Cajas ───────────────────────────────────────────────────
  const cajaDefs = ['Caja Principal', 'Caja Mostrador', 'Caja Chica'];
  for (const name of cajaDefs) {
    await save1<CashboxEntity>(cashboxRepo, { branchId: branch.id, name, status: 'closed' });
  }
  console.log(`  [4] ${cajaDefs.length} cajas creadas`);

  // ── 5. Clientes demo (20) ──────────────────────────────────────
  const channels = [
    { ch: 'mayorista', condition: 'Responsable Inscripto', listName: 'Mayorista' },
    { ch: 'minorista', condition: 'Monotributista', listName: 'Minorista' },
    { ch: 'gastronomia', condition: 'Responsable Inscripto', listName: 'Gastronomía' },
  ];
  const customers: CustomerEntity[] = [];
  for (let i = 0; i < 20; i++) {
    const ch = channels[i % channels.length];
    const list = priceLists.find((l) => l.name === ch.listName) ?? priceLists[0];
    const legalName = fk.company.name() + ' ' + pick(['S.A.', 'S.R.L.', 'S.A.S.', '']);
    const zone = zones.length ? pick(zones) : null;
    const route = routes.length ? pick(routes) : null;
    const customer = await save1<CustomerEntity>(customerRepo, {
      customerType: 'company',
      legalName,
      commercialName: fk.company.name().split(' ').slice(0, 2).join(' '),
      taxId: generateCuit(30),
      taxCondition: ch.condition,
      channel: ch.ch,
      status: 'active',
      category: pick(['A', 'B', 'C']),
      email: `contacto@${legalName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}.com.ar`,
      phone: `+54 11 ${randomBetween(4000, 5999)}-${randomBetween(1000, 9999)}`,
      creditLimit: randomBetween(50_000, 500_000),
      priceListId: list?.id ?? null,
      zoneId: zone?.id ?? null,
      routeId: route?.id ?? null,
      metadata: { demo_branch: BRANCH_CODE },
    });

    await save1<ContactEntity>(contactRepo, {
      customerId: customer.id,
      fullName: fk.person.fullName(),
      role: 'Compras',
      email: fk.internet.email().toLowerCase(),
      phone: `+54 9 11 ${randomBetween(4000, 5999)}-${randomBetween(1000, 9999)}`,
      isPrimary: true,
    });

    await save1<AddressEntity>(addressRepo, {
      customerId: customer.id,
      street: fk.location.streetAddress(),
      city: pick(['Buenos Aires', 'Rosario', 'Córdoba', 'La Plata', 'Mar del Plata']),
      province: 'Buenos Aires',
      country: 'AR',
      isPrimary: true,
      type: 'delivery',
    });

    customers.push(customer);
  }
  console.log(`  [5] ${customers.length} clientes creados`);

  // ── 6. Pedidos + facturas + pagos ──────────────────────────────
  const allCustomers = customers.length > 0
    ? customers
    : (await customerRepo.find({ where: { status: 'active' }, take: 50 }));

  let orderCount = 0;
  let invoiceCount = 0;
  let paymentCount = 0;

  for (let i = 0; i < ORDER_COUNT; i++) {
    const customer = pick(allCustomers);
    const itemCount = randomBetween(2, 8);
    const orderProducts = pickMany(products, itemCount);

    let subtotal = 0;
    let taxes = 0;
    const items: Partial<OrderItemEntity>[] = [];

    for (const prod of orderProducts) {
      const qty = randomBetween(1, 20);
      const unitPrice = Number(prod.basePrice);
      const tax = Math.round(unitPrice * qty * 0.21);
      const sub = Math.round(unitPrice * qty);
      subtotal += sub;
      taxes += tax;
      items.push({ productId: prod.id, quantity: qty, unitPrice, discount: 0, tax, subtotal: sub });
    }

    const total = subtotal + taxes;
    const status = weighted([
      ['confirmed', 40], ['delivered', 30], ['invoiced', 20], ['draft', 10],
    ]);
    const zone = zones.length ? pick(zones) : null;
    const route = routes.length ? pick(routes) : null;

    const order = await save1<OrderEntity>(orderRepo, {
      customerId: customer.id,
      branchId: branch.id,
      channel: customer.channel ?? 'mayorista',
      status,
      subtotal,
      taxes,
      discounts: 0,
      total,
      estimatedDeliveryDate: daysFromNow(randomBetween(1, 14)),
      zoneId: zone?.id ?? null,
      routeId: route?.id ?? null,
      createdAt: daysAgo(randomBetween(0, 90)),
    });

    for (const item of items) {
      await save1<OrderItemEntity>(orderItemRepo, { orderId: order.id, ...item });
    }
    orderCount++;

    // ~60% de los pedidos confirmados/entregados/facturados obtienen factura + pago
    if (['confirmed', 'delivered', 'invoiced'].includes(status) && Math.random() < 0.6) {
      const invType = customer.taxCondition === 'Responsable Inscripto' ? invoiceTypeA : invoiceTypeB;
      const invoice = await save1<InvoiceEntity>(invoiceRepo, {
        orderId: order.id,
        customerId: customer.id,
        typeId: invType?.id ?? null,
        number: String(invoiceCount + 1).padStart(8, '0'),
        issueDate: order.createdAt ?? daysAgo(randomBetween(0, 60)),
        subtotal,
        taxes,
        total,
        status: 'issued',
      });
      invoiceCount++;

      if (Math.random() < 0.7) {
        const amount = Math.round(total * (0.5 + Math.random() * 0.5));
        await save1<PaymentEntity>(paymentRepo, {
          type: 'receipt',
          date: daysAgo(randomBetween(0, 30)),
          customerId: customer.id,
          paymentMethod: pick(['cash', 'transfer', 'card', 'check']),
          amount,
          currency: 'ARS',
          status: 'confirmed',
          direction: 'in',
          invoiceId: invoice.id,
        });
        paymentCount++;
      }
    }
  }

  console.log(`  [6] ${orderCount} pedidos, ${invoiceCount} facturas, ${paymentCount} pagos`);
  console.log(`\nBranch demo lista: "${BRANCH_NAME}" (${BRANCH_CODE})`);
  console.log(`Branch ID: ${branch.id}`);
  process.exit(0);
}


seedDemoBranch().catch((err) => { console.error(err); process.exit(1); });
