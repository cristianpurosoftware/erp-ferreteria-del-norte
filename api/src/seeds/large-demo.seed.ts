import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/data-source';
import { BranchEntity } from '../modules/branches/data_access/branch.entity';
import { WarehouseEntity } from '../modules/warehouses/data_access/warehouse.entity';
import { UserEntity } from '../modules/users/data_access/user.entity';
import { RoleEntity } from '../modules/roles/data_access/role.entity';
import { DriverEntity } from '../modules/drivers/data_access/driver.entity';
import { VehicleEntity } from '../modules/vehicles/data_access/vehicle.entity';
import { BankAccountEntity } from '../modules/bank-accounts/data_access/bank-account.entity';
import { CashboxEntity } from '../modules/cashbox/data_access/cashbox.entity';
import { CashboxSessionEntity } from '../modules/cashbox/data_access/cashbox-session.entity';
import { BrandEntity } from '../modules/brands/data_access/brand.entity';
import { CategoryEntity } from '../modules/categories/data_access/category.entity';
import { ProductEntity } from '../modules/products/data_access/product.entity';
import { PriceListEntity } from '../modules/price-lists/data_access/price-list.entity';
import { PriceListItemEntity } from '../modules/price-lists/data_access/price-list-item.entity';
import { CustomerEntity } from '../modules/customers/data_access/customer.entity';
import { ContactEntity } from '../modules/customers/data_access/contact.entity';
import { AddressEntity } from '../modules/customers/data_access/address.entity';
import { SupplierEntity } from '../modules/suppliers/data_access/supplier.entity';
import { StockEntity } from '../modules/inventory/data_access/stock.entity';
import { StockMovementEntity } from '../modules/inventory/data_access/stock-movement.entity';
import { OrderEntity } from '../modules/orders/data_access/order.entity';
import { OrderItemEntity } from '../modules/orders/data_access/order-item.entity';
import { InvoiceEntity } from '../modules/invoices/data_access/invoice.entity';
import { InvoiceTypeEntity } from '../modules/invoice-types/data_access/invoice-type.entity';
import { DeliveryNoteEntity } from '../modules/delivery-notes/data_access/delivery-note.entity';
import { DeliveryNoteItemEntity } from '../modules/delivery-notes/data_access/delivery-note-item.entity';
import { PaymentEntity } from '../modules/payments/data_access/payment.entity';
import { CheckEntity } from '../modules/checks/data_access/check.entity';
import { AccountEntity } from '../modules/accounts/data_access/account.entity';
import { AccountEntryEntity } from '../modules/accounts/data_access/account-entry.entity';
import { PurchaseOrderEntity } from '../modules/purchases/data_access/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../modules/purchases/data_access/purchase-order-item.entity';
import { ShipmentEntity } from '../modules/shipments/data_access/shipment.entity';
import { ShipmentStopEntity } from '../modules/shipments/data_access/shipment-stop.entity';
import { AuditEventEntity } from '../modules/audit/data_access/audit-event.entity';
import { SalesZoneEntity } from '../modules/sales-zones/data_access/sales-zone.entity';
import { RouteEntity } from '../modules/routes/data_access/route.entity';
// Fase 2
import { CreditNoteEntity } from '../modules/credit-notes/data_access/credit-note.entity';
import { CreditNoteItemEntity } from '../modules/credit-notes/data_access/credit-note-item.entity';
import { DebitNoteEntity } from '../modules/debit-notes/data_access/debit-note.entity';
import { DebitNoteItemEntity } from '../modules/debit-notes/data_access/debit-note-item.entity';
import { DispatchSheetEntity } from '../modules/dispatch-sheets/data_access/dispatch-sheet.entity';
import { PickingTaskEntity } from '../modules/picking/data_access/picking-task.entity';
import { PickingTaskItemEntity } from '../modules/picking/data_access/picking-task-item.entity';
import { CommissionEntity } from '../modules/commissions/data_access/commission.entity';
import { PromotionEntity } from '../modules/promotions/data_access/promotion.entity';
import { PromotionItemEntity } from '../modules/promotions/data_access/promotion-item.entity';
// Fase 3
import { ReturnOrderEntity } from '../modules/returns/data_access/return-order.entity';
import { ReturnOrderItemEntity } from '../modules/returns/data_access/return-order-item.entity';
import { LotEntity } from '../modules/lots/data_access/lot.entity';
import { StockByLotEntity } from '../modules/lots/data_access/stock-by-lot.entity';
import { InventoryCountEntity } from '../modules/inventory-counts/data_access/inventory-count.entity';
import { InventoryCountLineEntity } from '../modules/inventory-counts/data_access/inventory-count-line.entity';
import { PaymentOrderEntity } from '../modules/payment-orders/data_access/payment-order.entity';
import { PaymentBatchEntity } from '../modules/payment-orders/data_access/payment-batch.entity';
import { SupplierClaimEntity } from '../modules/supplier-claims/data_access/supplier-claim.entity';
import { SupplierDeliveryNoteEntity } from '../modules/supplier-delivery-notes/data_access/supplier-delivery-note.entity';
import { WithholdingEntity } from '../modules/withholdings/data_access/withholding.entity';

import { fk, daysAgo, daysFromNow, randomBetween, pick, pickMany, weighted, generateCuit, chunk } from './demo/_helpers';

// Narrow TypeORM's overloaded save()/create() to a single-entity return type.
async function save1<T extends object>(
  repo: { save: (e: any) => Promise<any>; create: (e: any) => any },
  partial: object,
): Promise<T> {
  const created = repo.create(partial);
  return (await repo.save(created)) as unknown as T;
}

// ─── Volume knobs ────────────────────────────────────────────────
const V = {
  extraBranches: 3,
  extraWarehouses: 5,
  extraCashboxes: 5,
  users: 40,
  drivers: 10,
  vehicles: 12,
  bankAccounts: 6,
  brands: 30,
  products: 200,
  customers: 200,
  suppliers: 40,
  orders: 2000,
  futureOrders: 400,
  purchaseOrders: 500,
  shipments: 300,
  cashboxSessions: 400,
  checks: 200,
  auditEvents: 3000,
  // Fase 2
  promotions: 18,
  creditNotes: 80,
  debitNotes: 30,
  dispatchSheets: 150,
  pickingTasks: 300,
  // Fase 3
  productsWithLots: 40,
  lotsPerProduct: 3,
  inventoryCounts: 12,
  paymentBatches: 30,
  paymentOrdersPerBatch: 3,
  supplierClaims: 25,
  supplierDeliveryNotes: 300,
  withholdings: 150,
  returns: 60,
};

export async function seedLargeDemo() {
  const t0 = Date.now();

  const repo = {
    branch: AppDataSource.getRepository(BranchEntity),
    warehouse: AppDataSource.getRepository(WarehouseEntity),
    user: AppDataSource.getRepository(UserEntity),
    role: AppDataSource.getRepository(RoleEntity),
    driver: AppDataSource.getRepository(DriverEntity),
    vehicle: AppDataSource.getRepository(VehicleEntity),
    bank: AppDataSource.getRepository(BankAccountEntity),
    cashbox: AppDataSource.getRepository(CashboxEntity),
    cashboxSession: AppDataSource.getRepository(CashboxSessionEntity),
    brand: AppDataSource.getRepository(BrandEntity),
    category: AppDataSource.getRepository(CategoryEntity),
    product: AppDataSource.getRepository(ProductEntity),
    priceList: AppDataSource.getRepository(PriceListEntity),
    priceListItem: AppDataSource.getRepository(PriceListItemEntity),
    customer: AppDataSource.getRepository(CustomerEntity),
    contact: AppDataSource.getRepository(ContactEntity),
    address: AppDataSource.getRepository(AddressEntity),
    supplier: AppDataSource.getRepository(SupplierEntity),
    stock: AppDataSource.getRepository(StockEntity),
    movement: AppDataSource.getRepository(StockMovementEntity),
    order: AppDataSource.getRepository(OrderEntity),
    orderItem: AppDataSource.getRepository(OrderItemEntity),
    invoice: AppDataSource.getRepository(InvoiceEntity),
    invoiceType: AppDataSource.getRepository(InvoiceTypeEntity),
    deliveryNote: AppDataSource.getRepository(DeliveryNoteEntity),
    deliveryNoteItem: AppDataSource.getRepository(DeliveryNoteItemEntity),
    payment: AppDataSource.getRepository(PaymentEntity),
    check: AppDataSource.getRepository(CheckEntity),
    account: AppDataSource.getRepository(AccountEntity),
    entry: AppDataSource.getRepository(AccountEntryEntity),
    po: AppDataSource.getRepository(PurchaseOrderEntity),
    poItem: AppDataSource.getRepository(PurchaseOrderItemEntity),
    shipment: AppDataSource.getRepository(ShipmentEntity),
    shipmentStop: AppDataSource.getRepository(ShipmentStopEntity),
    audit: AppDataSource.getRepository(AuditEventEntity),
    zone: AppDataSource.getRepository(SalesZoneEntity),
    route: AppDataSource.getRepository(RouteEntity),
    // Fase 2
    creditNote: AppDataSource.getRepository(CreditNoteEntity),
    creditNoteItem: AppDataSource.getRepository(CreditNoteItemEntity),
    debitNote: AppDataSource.getRepository(DebitNoteEntity),
    debitNoteItem: AppDataSource.getRepository(DebitNoteItemEntity),
    dispatchSheet: AppDataSource.getRepository(DispatchSheetEntity),
    pickingTask: AppDataSource.getRepository(PickingTaskEntity),
    pickingTaskItem: AppDataSource.getRepository(PickingTaskItemEntity),
    commission: AppDataSource.getRepository(CommissionEntity),
    promotion: AppDataSource.getRepository(PromotionEntity),
    promotionItem: AppDataSource.getRepository(PromotionItemEntity),
    // Fase 3
    returnOrder: AppDataSource.getRepository(ReturnOrderEntity),
    returnOrderItem: AppDataSource.getRepository(ReturnOrderItemEntity),
    lot: AppDataSource.getRepository(LotEntity),
    stockByLot: AppDataSource.getRepository(StockByLotEntity),
    inventoryCount: AppDataSource.getRepository(InventoryCountEntity),
    inventoryCountLine: AppDataSource.getRepository(InventoryCountLineEntity),
    paymentOrder: AppDataSource.getRepository(PaymentOrderEntity),
    paymentBatch: AppDataSource.getRepository(PaymentBatchEntity),
    supplierClaim: AppDataSource.getRepository(SupplierClaimEntity),
    supplierDeliveryNote: AppDataSource.getRepository(SupplierDeliveryNoteEntity),
    withholding: AppDataSource.getRepository(WithholdingEntity),
  };

  // ── Bootstrap lookups ───────────────────────────────────────────
  const casaCentral = await repo.branch.findOneBy({ code: 'CASA-CENTRAL' });
  if (!casaCentral) throw new Error('CASA-CENTRAL branch missing. Run company seed first.');
  const baseWarehouse = await repo.warehouse.findOne({ where: { branchId: casaCentral.id } });
  if (!baseWarehouse) throw new Error('Base warehouse missing.');
  const adminUser = await repo.user.findOne({ where: { email: process.env.ADMIN_EMAIL || 'admin@example.com' } }) ?? await repo.user.findOne({ where: {} });
  if (!adminUser) throw new Error('Admin user missing. Run admin seed first.');
  const roles = {
    admin: await repo.role.findOneBy({ name: 'admin' }),
    gerencia: await repo.role.findOneBy({ name: 'gerencia' }),
    ventas: await repo.role.findOneBy({ name: 'ventas' }),
    operaciones: await repo.role.findOneBy({ name: 'operaciones' }),
    administracion: await repo.role.findOneBy({ name: 'administracion' }),
  };
  const invTypeA = await repo.invoiceType.findOneBy({ code: 'FA' });
  const invTypeB = await repo.invoiceType.findOneBy({ code: 'FB' });
  const zones = await repo.zone.find();
  const routes = await repo.route.find();
  const categories = await repo.category.find();

  // ── 01. Infrastructure: branches, warehouses, cashboxes, drivers, vehicles, bank accounts ──
  const branchDefs = [
    { code: 'SUC-NORTE', name: 'Sucursal Norte' },
    { code: 'SUC-SUR', name: 'Sucursal Sur' },
    { code: 'SUC-EXPRESS', name: 'Sucursal Express' },
  ];
  const extraBranches: BranchEntity[] = [];
  for (const b of branchDefs.slice(0, V.extraBranches)) {
    const saved = await repo.branch.save(repo.branch.create({
      company_id: (casaCentral as any).company_id,
      code: b.code,
      name: b.name,
      status: 'active',
    } as any)) as unknown as BranchEntity;
    extraBranches.push(saved);
  }
  const allBranches = [casaCentral, ...extraBranches];

  const extraWarehouses: WarehouseEntity[] = [];
  const whDefs = [
    { name: 'Depósito Seco Norte', branch: extraBranches[0]?.id, type: 'physical' },
    { name: 'Depósito Frío Norte', branch: extraBranches[0]?.id, type: 'physical' },
    { name: 'Depósito Sur', branch: extraBranches[1]?.id, type: 'physical' },
    { name: 'Depósito Express', branch: extraBranches[2]?.id, type: 'physical' },
    { name: 'Depósito Virtual Consignación', branch: casaCentral.id, type: 'virtual' },
  ];
  for (const w of whDefs.slice(0, V.extraWarehouses)) {
    if (!w.branch) continue;
    const saved = await repo.warehouse.save(repo.warehouse.create({
      branchId: w.branch,
      name: w.name,
      type: w.type,
      status: 'active',
    })) as unknown as WarehouseEntity;
    extraWarehouses.push(saved);
  }
  const allWarehouses = [baseWarehouse, ...extraWarehouses];

  for (const b of extraBranches) {
    for (const name of ['Caja Principal', 'Caja Secundaria']) {
      await repo.cashbox.save(repo.cashbox.create({ branchId: b.id, name: `${name} ${b.code}`, status: 'closed' }));
    }
  }
  const allCashboxes = await repo.cashbox.find();

  const drivers: DriverEntity[] = [];
  for (let i = 0; i < V.drivers; i++) {
    drivers.push(await repo.driver.save(repo.driver.create({
      fullName: fk.person.fullName(),
      dni: String(randomBetween(20_000_000, 45_000_000)),
      licenseNumber: `B1-${randomBetween(10_000_000, 99_999_999)}`,
      licenseExpires: daysFromNow(randomBetween(180, 1800)),
      phone: `+54 9 11 ${randomBetween(4000, 5999)}-${randomBetween(1000, 9999)}`,
      status: 'active',
    })));
  }

  const vehicles: VehicleEntity[] = [];
  for (let i = 0; i < V.vehicles; i++) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const plate = `${pick(letters)}${pick(letters)}${randomBetween(100, 999)}${pick(letters)}${pick(letters)}`;
    vehicles.push(await repo.vehicle.save(repo.vehicle.create({
      plate,
      model: pick(['Mercedes Sprinter', 'Iveco Daily', 'Renault Master', 'Ford Transit', 'VW Crafter', 'Peugeot Boxer']),
      capacityKg: pick([1200, 1500, 2000, 3500, 5000]),
      capacityM3: pick([8, 12, 18, 24]),
      status: weighted([['active', 85], ['maintenance', 10], ['retired', 5]]),
    })));
  }

  const bankAccounts: BankAccountEntity[] = [];
  const banks = ['Banco Galicia', 'Banco Santander', 'Banco Nación', 'Banco Provincia', 'BBVA', 'HSBC'];
  for (let i = 0; i < V.bankAccounts; i++) {
    bankAccounts.push(await repo.bank.save(repo.bank.create({
      name: `Cuenta Corriente ${i + 1}`,
      bankName: banks[i % banks.length],
      cbu: String(randomBetween(1_000_000_000, 9_999_999_999)) + String(randomBetween(1_000_000_000, 9_999_999_999)).slice(0, 12),
      alias: `empresa.${['norte','sur','este','oeste','centro'][i % 5]}.${String(i + 1).padStart(3, '0')}`,
      accountNumber: String(randomBetween(1_000_000, 9_999_999)),
      currency: 'ARS',
      status: 'active',
    })));
  }
  console.log(`  [01] infra: +${extraBranches.length} branches, +${extraWarehouses.length} warehouses, +${drivers.length} drivers, +${vehicles.length} vehicles, ${bankAccounts.length} bank accts`);

  // ── 02. Users (40) ────────────────────────────────────────────
  const pwHash = await bcrypt.hash('demo1234', 10);
  const users: UserEntity[] = [];
  const userSlots = [
    { count: 2, role: roles.gerencia, prefix: 'gerencia' },
    { count: 12, role: roles.ventas, prefix: 'ventas' },
    { count: 10, role: roles.operaciones, prefix: 'ops' },
    { count: 8, role: roles.administracion, prefix: 'admin' },
    { count: 5, role: roles.ventas, prefix: 'cobrador' },
  ];
  let idx = 0;
  for (const slot of userSlots) {
    for (let i = 0; i < slot.count && idx < V.users; i++, idx++) {
      const first = fk.person.firstName();
      const last = fk.person.lastName();
      const email = `${slot.prefix}.${last.toLowerCase().replace(/[^a-z]/g, '')}.${idx}@demo.com`;
      const u = await save1<UserEntity>(repo.user, {
        first_name: first,
        last_name: last,
        email,
        password_hash: pwHash,
        roleId: slot.role?.id,
        status: 'active',
      } as any);
      users.push(u);
    }
  }
  const sellers = users.filter((_, i) => i >= 2 && i < 14);
  const collectors = users.filter((_, i) => i >= 35);
  console.log(`  [02] users: ${users.length} (${sellers.length} sellers, ${collectors.length} collectors)`);

  // ── 03. Catalog: brands, products, price lists ─────────────────
  const SKIP_PRODUCTS = process.env.SEED_LARGE_DEMO_SKIP_PRODUCTS === 'true';

  let brands: BrandEntity[];
  let products: ProductEntity[];

  if (SKIP_PRODUCTS) {
    brands = await repo.brand.find();
    products = await repo.product.find({ where: { status: 'active' } });
    if (products.length === 0) throw new Error('[large-demo] No hay productos activos. Correr catalogopro seed primero.');
    console.log(`  [03] catalog: SKIP — usando ${brands.length} marcas y ${products.length} productos del catálogo real`);
  } else {
    const brandNames = [
      'Arcor', 'Marolio', 'La Serenisima', 'Unilever', 'P&G', 'Quilmes', 'Coca-Cola', 'Molinos',
      'La Virginia', 'Terrabusi', 'Bagley', 'Bimbo', 'Georgalos', 'Mantecol', 'Mondelez',
      'Pepsico', 'Danone', 'Mastellone', 'Sancor', 'Milkaut', 'Cachamai', 'Knorr', 'Maggi',
      'Molto', 'Cunnington', 'Pritty', 'Manaos', 'Paso de los Toros', 'Schneider', 'Andes',
    ];
    brands = [];
    for (const name of brandNames.slice(0, V.brands)) {
      brands.push(await repo.brand.save(repo.brand.create({ name, status: 'active' })));
    }

    const productTemplates = [
      { cat: 'Bebidas', prefix: 'BEB', examples: ['Agua mineral', 'Gaseosa cola', 'Gaseosa lima-limón', 'Jugo de naranja', 'Cerveza rubia', 'Cerveza negra', 'Vino tinto', 'Vino blanco', 'Energizante', 'Isotónica'] },
      { cat: 'Alimentos', prefix: 'ALI', examples: ['Fideos', 'Arroz', 'Aceite girasol', 'Aceite oliva', 'Azúcar', 'Harina', 'Sal fina', 'Mermelada durazno', 'Dulce de leche', 'Galletitas', 'Alfajor', 'Yerba mate', 'Café molido', 'Té en saquitos', 'Cacao en polvo', 'Atún en aceite', 'Arvejas en lata', 'Choclo en lata', 'Tomate triturado', 'Salsa de tomate'] },
      { cat: 'Limpieza', prefix: 'LIM', examples: ['Detergente', 'Lavandina', 'Jabón líquido', 'Jabón en polvo', 'Suavizante', 'Desodorante de ambiente', 'Papel higiénico', 'Servilletas', 'Rollo de cocina', 'Bolsas residuos', 'Esponja multiuso', 'Trapo piso', 'Escoba', 'Lampazo'] },
      { cat: 'General', prefix: 'GEN', examples: ['Pilas AA', 'Pilas AAA', 'Lámpara LED', 'Cinta aisladora', 'Cinta adhesiva'] },
    ];
    const sizes = ['500ml', '1L', '1.5L', '2L', '250g', '500g', '1kg', '2kg', 'x3', 'x6', 'x12', 'x24'];
    products = [];
    while (products.length < V.products) {
      const tmpl = pick(productTemplates);
      const cat = categories.find((c) => c.name === tmpl.cat) || categories[0];
      const ex = pick(tmpl.examples);
      const size = pick(sizes);
      const brand = pick(brands);
      const sku = `${tmpl.prefix}-${String(products.length + 1).padStart(4, '0')}`;
      const basePrice = randomBetween(200, 15000);
      const baseCost = Math.round(basePrice * (0.4 + Math.random() * 0.3));
      products.push(await repo.product.save(repo.product.create({
        name: `${ex} ${brand.name} ${size}`,
        sku,
        description: fk.commerce.productDescription(),
        categoryId: cat.id,
        brandId: brand.id,
        productType: 'physical',
        basePrice,
        baseCost,
        controlsStock: true,
        minStock: randomBetween(5, 50),
        reorderPoint: randomBetween(10, 100),
        leadTimeDays: randomBetween(1, 21),
        status: 'active',
      })));
    }
  }

  const priceListDefs = [
    { name: 'Mayorista', factor: 0.85, isDefault: true },
    { name: 'Minorista', factor: 1.2, isDefault: false },
    { name: 'Gastronomía', factor: 0.95, isDefault: false },
    { name: 'Preferencial', factor: 0.8, isDefault: false },
    { name: 'Contado Descuento', factor: 0.75, isDefault: false },
  ];
  const priceLists: PriceListEntity[] = [];
  for (const pl of priceListDefs) {
    let existing = await repo.priceList.findOneBy({ name: pl.name });
    if (!existing) {
      existing = await save1<PriceListEntity>(repo.priceList, {
        name: pl.name, currency: 'ARS', status: 'active', isDefault: pl.isDefault,
      } as any);
    }
    priceLists.push(existing);
  }
  // Build price list items — skip if already populated (idempotent for SKIP_PRODUCTS reruns)
  const alreadyHasItems = products.length > 0 && !!(await repo.priceListItem.findOne({
    where: { priceListId: priceLists[0].id, productId: products[0].id },
  }));
  if (!alreadyHasItems) {
    const pliRows: Partial<PriceListItemEntity>[] = [];
    for (const pl of priceLists) {
      const factor = priceListDefs.find((x) => x.name === pl.name)!.factor;
      for (const p of products) {
        pliRows.push({ priceListId: pl.id, productId: p.id, price: Math.round(Number(p.basePrice) * factor), minQuantity: 1 });
      }
    }
    for (const batch of chunk(pliRows, 500)) {
      await repo.priceListItem.insert(batch);
    }
    console.log(`  [03] catalog: ${brands.length} brands, ${products.length} products, ${priceLists.length} price lists (${pliRows.length} items)`);
  } else {
    console.log(`  [03] catalog: ${brands.length} brands, ${products.length} products, ${priceLists.length} price lists (items ya existentes)`);
  }

  // ── 04. Customers ────────────────────────────────────────────
  const channels: Array<{ ch: string; weight: number; condition: string; creditMin: number; creditMax: number; listName: string }> = [
    { ch: 'mayorista', weight: 40, condition: 'Responsable Inscripto', creditMin: 200_000, creditMax: 1_500_000, listName: 'Mayorista' },
    { ch: 'gastronomia', weight: 15, condition: 'Responsable Inscripto', creditMin: 100_000, creditMax: 800_000, listName: 'Gastronomía' },
    { ch: 'minorista', weight: 35, condition: 'Monotributista', creditMin: 30_000, creditMax: 200_000, listName: 'Minorista' },
    { ch: 'mostrador', weight: 10, condition: 'Consumidor Final', creditMin: 0, creditMax: 0, listName: 'Minorista' },
  ];
  const provinces = [
    { city: 'Buenos Aires', prov: 'Buenos Aires' },
    { city: 'Rosario', prov: 'Santa Fe' },
    { city: 'Córdoba', prov: 'Córdoba' },
    { city: 'Mendoza', prov: 'Mendoza' },
    { city: 'La Plata', prov: 'Buenos Aires' },
    { city: 'Mar del Plata', prov: 'Buenos Aires' },
    { city: 'San Miguel de Tucumán', prov: 'Tucumán' },
    { city: 'Salta', prov: 'Salta' },
    { city: 'Neuquén', prov: 'Neuquén' },
    { city: 'Bahía Blanca', prov: 'Buenos Aires' },
  ];
  const customers: CustomerEntity[] = [];
  const contactRows: Partial<ContactEntity>[] = [];
  const addressRows: Partial<AddressEntity>[] = [];

  for (let i = 0; i < V.customers; i++) {
    const channelSpec = weighted(channels.map((c) => [c, c.weight] as [any, number]));
    const isCompany = channelSpec.ch !== 'mostrador';
    const legalName = isCompany
      ? fk.company.name() + ' ' + pick(['S.A.', 'S.R.L.', 'S.A.S.', 'y Asoc.', ''])
      : fk.person.fullName();
    const commercial = isCompany ? fk.company.name().split(' ').slice(0, 2).join(' ') : null;
    const list = priceLists.find((l) => l.name === channelSpec.listName)!;
    const customer = await save1<CustomerEntity>(repo.customer, {
      customerType: isCompany ? 'company' : 'individual',
      legalName,
      commercialName: commercial,
      taxId: generateCuit(isCompany ? 30 : 20),
      taxCondition: channelSpec.condition,
      channel: channelSpec.ch,
      status: weighted([['active', 90], ['on_hold', 5], ['inactive', 3], ['blocked', 2]]),
      category: weighted([['A', 20], ['B', 50], ['C', 30]]),
      email: isCompany ? `ventas@${legalName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}.com.ar` : fk.internet.email().toLowerCase(),
      phone: `+54 11 ${randomBetween(4000, 5999)}-${randomBetween(1000, 9999)}`,
      assignedSellerId: sellers.length ? pick(sellers).id : null,
      priceListId: list.id,
      zoneId: zones.length ? pick(zones).id : null,
      routeId: routes.length ? pick(routes).id : null,
      creditLimit: randomBetween(channelSpec.creditMin, channelSpec.creditMax),
      creditPolicy: weighted([['normal', 80], ['strict', 15], ['blocked', 5]]),
      overdueDaysThreshold: pick([15, 30, 45, 60]),
    } as any);
    customers.push(customer);

    if (isCompany) {
      const numContacts = randomBetween(1, 3);
      for (let j = 0; j < numContacts; j++) {
        contactRows.push({
          customerId: customer.id,
          name: fk.person.fullName(),
          position: pick(['Gerente', 'Compras', 'Encargado', 'Dueño', 'Contador', 'Administración']),
          email: fk.internet.email().toLowerCase(),
          phone: `+54 11 ${randomBetween(4000, 5999)}-${randomBetween(1000, 9999)}`,
          isPrimary: j === 0,
        });
      }
    }
    const cityIdx = randomBetween(0, provinces.length - 1);
    const numAddr = isCompany ? randomBetween(1, 2) : 1;
    for (let j = 0; j < numAddr; j++) {
      addressRows.push({
        customerId: customer.id,
        type: j === 0 ? 'shipping' : 'billing',
        street: `${fk.location.streetAddress()}`,
        city: provinces[cityIdx].city,
        province: provinces[cityIdx].prov,
        country: 'Argentina',
        postalCode: String(randomBetween(1000, 9999)),
      });
    }
  }
  for (const b of chunk(contactRows, 500)) await repo.contact.insert(b);
  for (const b of chunk(addressRows, 500)) await repo.address.insert(b);
  console.log(`  [04] customers: ${customers.length} (+${contactRows.length} contacts, +${addressRows.length} addresses)`);

  // ── 05. Suppliers ────────────────────────────────────────────
  const suppliers: SupplierEntity[] = [];
  const supplierBaseNames = brands.map((b) => b.name).slice(0, Math.min(V.suppliers, brands.length));
  for (let i = 0; i < V.suppliers; i++) {
    const base = supplierBaseNames[i] ?? fk.company.name();
    const s = await save1<SupplierEntity>(repo.supplier, {
      name: `${base} ${pick(['S.A.', 'S.R.L.', 'Argentina', 'Distribución', ''])}`.trim(),
      taxId: generateCuit(30),
      primaryContact: fk.person.fullName(),
      email: `ventas@${base.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14)}.com.ar`,
      phone: `+54 11 ${randomBetween(4000, 5999)}-${randomBetween(1000, 9999)}`,
      paymentCondition: pick(['Contado', '30 dias', '60 dias', '90 dias']),
      status: 'active',
    } as any);
    suppliers.push(s);
  }
  console.log(`  [05] suppliers: ${suppliers.length}`);

  // ── 06. Stock initial + movements ────────────────────────────
  const stockRows: Partial<StockEntity>[] = [];
  const initialMovementRows: Partial<StockMovementEntity>[] = [];
  const stockMap = new Map<string, { productId: string; warehouseId: string; qty: number }>();

  const physicalWarehouses = allWarehouses.filter((w) => (w as any).type !== 'virtual');
  for (const p of products) {
    for (const w of physicalWarehouses) {
      const qty = randomBetween(50, 500);
      stockRows.push({
        productId: p.id,
        warehouseId: w.id,
        availableQty: qty,
        reservedQty: 0,
        inTransitQty: 0,
        minStock: p.minStock,
      } as any);
      stockMap.set(`${p.id}:${w.id}`, { productId: p.id, warehouseId: w.id, qty });
      initialMovementRows.push({
        type: 'adjustment',
        date: daysAgo(randomBetween(700, 730)),
        productId: p.id,
        destWarehouseId: w.id,
        quantity: qty,
        reason: 'Inventario inicial histórico',
        referenceType: 'seed',
        userId: adminUser.id,
      } as any);
    }
  }
  for (const b of chunk(stockRows, 500)) await repo.stock.insert(b);
  for (const b of chunk(initialMovementRows, 500)) await repo.movement.insert(b);
  console.log(`  [06] stock initial: ${stockRows.length} rows, ${initialMovementRows.length} movements`);

  // ── 07. Purchase orders ──────────────────────────────────────
  const poStatuses = [
    ['received', 60], ['partially_received', 10], ['sent', 10], ['approved', 10], ['draft', 5], ['cancelled', 5],
  ] as Array<[string, number]>;
  for (let i = 0; i < V.purchaseOrders; i++) {
    const supplier = pick(suppliers);
    const status = weighted(poStatuses);
    const ageDays = randomBetween(1, 720);
    const numItems = randomBetween(2, 8);
    const picked = pickMany(products, numItems);
    let subtotal = 0;
    const items: Partial<PurchaseOrderItemEntity>[] = [];
    for (const p of picked) {
      const qty = randomBetween(20, 200);
      const unitCost = Number(p.baseCost);
      items.push({ productId: p.id, quantity: qty, unitCost, subtotal: qty * unitCost });
      subtotal += qty * unitCost;
    }
    const taxes = Math.round(subtotal * 0.21);
    const total = subtotal + taxes;
    const po = await save1<PurchaseOrderEntity>(repo.po, {
      supplierId: supplier.id,
      branchId: pick(allBranches).id,
      date: daysAgo(ageDays),
      status,
      subtotal, taxes, total,
    } as any);
    for (const it of items) {
      await repo.poItem.save(repo.poItem.create({ purchaseOrderId: po.id, ...it } as any));
    }
  }
  console.log(`  [07] purchase orders: ${V.purchaseOrders}`);

  // ── 08. Orders + items + 09. Invoices + Delivery Notes + Payments ──
  const orderStatusByAge = (ageDays: number): string => {
    if (ageDays < 0) return weighted([['draft', 40], ['pending_confirmation', 30], ['confirmed', 20], ['stock_reserved', 10]]);
    if (ageDays <= 2) return weighted([['confirmed', 40], ['stock_reserved', 30], ['in_preparation', 20], ['ready_to_dispatch', 10]]);
    if (ageDays <= 10) return weighted([['dispatched', 25], ['delivered', 40], ['completed', 25], ['cancelled', 5], ['rejected', 5]]);
    if (ageDays <= 60) return weighted([['completed', 70], ['delivered', 15], ['cancelled', 10], ['rejected', 5]]);
    return weighted([['completed', 90], ['cancelled', 10]]);
  };

  const orders: OrderEntity[] = [];
  const orderItemsMap = new Map<string, { productId: string; quantity: number; unitPrice: number; subtotal: number }[]>();
  // Distribution: 80% historical, 20% future
  const totalOrders = V.orders + V.futureOrders;
  for (let i = 0; i < totalOrders; i++) {
    const isFuture = i >= V.orders;
    const ageDays = isFuture ? -randomBetween(1, 270) : Math.floor(randomBetween(0, 720) * (0.5 + Math.random() * 0.5));
    const created = ageDays >= 0 ? daysAgo(ageDays) : daysFromNow(-ageDays);
    const customer = pick(customers);
    const seller = sellers.length ? pick(sellers) : adminUser;
    const status = orderStatusByAge(ageDays);
    const numItems = randomBetween(1, 8);
    const picked = pickMany(products, numItems);
    let subtotal = 0; let taxes = 0; let discounts = 0;
    const itemRows: { productId: string; quantity: number; unitPrice: number; subtotal: number }[] = [];
    for (const p of picked) {
      const qty = randomBetween(1, 36);
      const unitPrice = Number(p.basePrice);
      const line = qty * unitPrice;
      const discount = Math.random() > 0.7 ? Math.round(line * 0.05) : 0;
      const tax = Math.round((line - discount) * 0.21);
      const lineSub = line - discount;
      itemRows.push({ productId: p.id, quantity: qty, unitPrice, subtotal: lineSub });
      subtotal += lineSub; taxes += tax; discounts += discount;
    }
    const total = subtotal + taxes;
    const order = await save1<OrderEntity>(repo.order, {
      customerId: customer.id,
      branchId: (customer.zoneId && zones.find((z) => z.id === customer.zoneId) ? pick(allBranches).id : pick(allBranches).id),
      sellerId: seller.id,
      channel: customer.channel || 'mostrador',
      status,
      estimatedDeliveryDate: isFuture ? daysFromNow(randomBetween(1, 30)) : created,
      subtotal, taxes, discounts, total,
      zoneId: customer.zoneId,
      routeId: customer.routeId,
      operationType: 'sale',
      createdAt: created,
    } as any);
    orders.push(order);
    orderItemsMap.set(order.id, itemRows);
    for (const it of itemRows) {
      await repo.orderItem.save(repo.orderItem.create({ orderId: order.id, ...it, discount: 0, tax: Math.round(it.subtotal * 0.21) }));
    }
  }
  console.log(`  [08] orders: ${orders.length} (${V.orders} historical + ${V.futureOrders} future)`);

  // Stock movements for dispatched/delivered/completed orders (batch)
  const saleMovementRows: Partial<StockMovementEntity>[] = [];
  for (const o of orders) {
    if (!['dispatched', 'delivered', 'completed'].includes(o.status)) continue;
    const items = orderItemsMap.get(o.id) || [];
    for (const it of items) {
      saleMovementRows.push({
        type: 'sale',
        date: o.createdAt,
        productId: it.productId,
        sourceWarehouseId: baseWarehouse.id,
        quantity: it.quantity,
        reason: `Venta pedido ${o.number}`,
        referenceType: 'order',
        referenceId: o.id,
        userId: adminUser.id,
      } as any);
    }
  }
  for (const b of chunk(saleMovementRows, 500)) await repo.movement.insert(b);
  console.log(`       sale movements: ${saleMovementRows.length}`);

  // Invoices (for delivered/completed)
  const invoicedOrders = orders.filter((o) => ['completed', 'delivered', 'dispatched'].includes(o.status));
  const invoices: InvoiceEntity[] = [];
  let invNumber = 1;
  for (const o of invoicedOrders) {
    const c = customers.find((cu) => cu.id === o.customerId)!;
    const isRI = c.taxCondition === 'Responsable Inscripto';
    const typeId = isRI ? invTypeA?.id : invTypeB?.id;
    const issuedAt = new Date(o.createdAt.getTime() + (24 * 3600 * 1000));
    const inv = await save1<InvoiceEntity>(repo.invoice, {
      orderId: o.id,
      typeId: typeId || null,
      number: `0001-${String(invNumber++).padStart(8, '0')}`,
      issueDate: issuedAt,
      customerId: o.customerId,
      subtotal: o.subtotal,
      taxes: o.taxes,
      total: o.total,
      status: 'issued',
      fiscalIntegrationStatus: 'approved',
      cae: String(randomBetween(10_000_000_000_000, 99_999_999_999_999)),
      caeExpiration: daysFromNow(10),
      salesPoint: '00001',
      invoiceType: isRI ? 'A' : 'B',
    } as any);
    invoices.push(inv);
  }
  console.log(`  [09a] invoices: ${invoices.length}`);

  // Delivery notes (for dispatched/delivered/completed)
  const dnNoteRows: Partial<DeliveryNoteEntity>[] = [];
  let dnNumber = 1;
  const dnByOrder = new Map<string, DeliveryNoteEntity>();
  for (const o of orders) {
    if (!['dispatched', 'delivered', 'completed'].includes(o.status)) continue;
    const dn = await save1<DeliveryNoteEntity>(repo.deliveryNote, {
      number: `R-0001-${String(dnNumber++).padStart(8, '0')}`,
      salesPoint: '00001',
      invoiceType: 'R',
      issueDate: o.createdAt,
      customerId: o.customerId,
      orderId: o.id,
      warehouseId: baseWarehouse.id,
      driverId: drivers.length ? pick(drivers).id : null,
      vehicleId: vehicles.length ? pick(vehicles).id : null,
      status: o.status === 'completed' ? 'invoiced' : 'issued',
      invoiceId: invoices.find((inv) => inv.orderId === o.id)?.id || null,
    } as any);
    dnByOrder.set(o.id, dn);
    const items = orderItemsMap.get(o.id) || [];
    for (const it of items) {
      await repo.deliveryNoteItem.save(repo.deliveryNoteItem.create({
        deliveryNoteId: dn.id,
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      } as any));
    }
  }
  console.log(`  [09b] delivery notes: ${dnByOrder.size}`);

  // Customer accounts
  const paymentMethods = ['cash', 'transfer', 'check', 'card', 'other'];
  const paymentMethodWeights: Array<[string, number]> = [
    ['cash', 25], ['transfer', 40], ['check', 15], ['card', 15], ['other', 5],
  ];
  const accounts: AccountEntity[] = [];
  const entryRows: Partial<AccountEntryEntity>[] = [];
  const paymentRows: Partial<PaymentEntity>[] = [];
  for (const c of customers) {
    const account = await save1<AccountEntity>(repo.account, {
      entityType: 'customer',
      entityId: c.id,
      currentBalance: 0,
      overdueBalance: 0,
      creditLimit: c.creditLimit,
    } as any);
    accounts.push(account);

    const custOrders = orders.filter((o) => o.customerId === c.id && ['completed', 'delivered', 'dispatched'].includes(o.status));
    let balance = 0;
    for (const o of custOrders) {
      balance += Number(o.total);
      entryRows.push({
        accountId: account.id,
        date: o.createdAt,
        type: 'debit',
        concept: `Pedido #${o.number}`,
        referenceType: 'order',
        referenceId: o.id,
        amount: Number(o.total),
        resultingBalance: balance,
        status: 'confirmed',
      } as any);

      // 80% of completed orders are paid within 45 days
      if (o.status === 'completed' && Math.random() < 0.8) {
        const payAmount = Number(o.total);
        const payDays = randomBetween(1, 45);
        const payDate = new Date(o.createdAt.getTime() + payDays * 86400000);
        const pm = weighted(paymentMethodWeights);
        balance -= payAmount;
        entryRows.push({
          accountId: account.id,
          date: payDate,
          type: 'credit',
          concept: `Pago pedido #${o.number}`,
          referenceType: 'payment',
          amount: payAmount,
          resultingBalance: balance,
          status: 'confirmed',
        } as any);
        paymentRows.push({
          type: 'collection',
          direction: 'in',
          date: payDate,
          customerId: c.id,
          paymentMethod: pm,
          amount: payAmount,
          currency: 'ARS',
          status: 'applied',
          invoiceId: invoices.find((inv) => inv.orderId === o.id)?.id || null,
          bankAccountId: pm === 'transfer' ? pick(bankAccounts).id : null,
        } as any);
      }
    }
    account.currentBalance = balance;
    if (balance > 0) {
      const overdueRatio = weighted([[0, 50], [0.2, 25], [0.4, 15], [0.7, 10]]);
      account.overdueBalance = Math.round(balance * overdueRatio);
    }
    await repo.account.save(account);
  }
  for (const b of chunk(entryRows, 500)) await repo.entry.insert(b);
  for (const b of chunk(paymentRows, 500)) await repo.payment.insert(b);
  console.log(`  [09c] accounts: ${accounts.length}, entries: ${entryRows.length}, payments: ${paymentRows.length}`);

  // ── Checks (subset of check payments) ────────────────────────
  const checkRows: Partial<CheckEntity>[] = [];
  for (let i = 0; i < V.checks; i++) {
    const c = pick(customers.filter((cu) => cu.customerType === 'company'));
    const issueDate = daysAgo(randomBetween(1, 90));
    const daysToDue = randomBetween(-10, 90);
    const dueDate = new Date(issueDate.getTime() + daysToDue * 86400000);
    const amount = randomBetween(10_000, 500_000);
    const overdue = dueDate.getTime() < Date.now();
    const status = overdue
      ? weighted([['cleared', 80], ['bounced', 10], ['deposited', 10]])
      : weighted([['in_portfolio', 60], ['deposited', 30], ['cleared', 10]]);
    checkRows.push({
      number: String(randomBetween(10_000_000, 99_999_999)),
      bankName: pick(['Galicia', 'Santander', 'Nación', 'Provincia', 'BBVA', 'HSBC', 'Macro', 'Credicoop']),
      accountHolder: c.legalName,
      cuit: c.taxId,
      amount,
      issueDate,
      dueDate,
      kind: daysToDue > 30 ? 'deferred' : 'common',
      ownOrThird: 'third',
      receivedFromCustomerId: c.id,
      bankAccountId: status === 'deposited' || status === 'cleared' ? pick(bankAccounts).id : null,
      status,
      depositedAt: ['deposited', 'cleared', 'bounced'].includes(status) ? new Date(issueDate.getTime() + 10 * 86400000) : null,
      clearedAt: status === 'cleared' ? new Date(issueDate.getTime() + 15 * 86400000) : null,
      bouncedAt: status === 'bounced' ? new Date(issueDate.getTime() + 12 * 86400000) : null,
      bounceReason: status === 'bounced' ? pick(['Sin fondos suficientes', 'Cuenta cerrada', 'Firma no coincide']) : null,
    } as any);
  }
  for (const b of chunk(checkRows, 500)) await repo.check.insert(b);
  console.log(`  [09d] checks: ${checkRows.length}`);

  // ── 10. Shipments + stops ────────────────────────────────────
  const dispatchedOrCompleted = orders.filter((o) => ['dispatched', 'delivered', 'completed'].includes(o.status));
  for (let i = 0; i < Math.min(V.shipments, Math.floor(dispatchedOrCompleted.length / 5)); i++) {
    const plannedDate = daysAgo(randomBetween(1, 720));
    const stopsPerShipment = randomBetween(3, 8);
    const slice = dispatchedOrCompleted.slice(i * stopsPerShipment, (i + 1) * stopsPerShipment);
    if (slice.length === 0) break;
    const allFinal = slice.every((o) => ['delivered', 'completed'].includes(o.status));
    const status = allFinal ? 'completed' : weighted([['in_transit', 30], ['loaded', 20], ['completed', 50]]);
    const shipment = await save1<ShipmentEntity>(repo.shipment, {
      warehouseId: baseWarehouse.id,
      vehicleId: vehicles.length ? pick(vehicles).id : null,
      driverId: drivers.length ? pick(drivers).id : null,
      plannedDate,
      departedAt: status !== 'planned' ? new Date(plannedDate.getTime() + 7 * 3600 * 1000) : null,
      returnedAt: status === 'completed' ? new Date(plannedDate.getTime() + 10 * 3600 * 1000) : null,
      status,
      totalStops: slice.length,
      totalWeightKg: randomBetween(500, 3500),
    } as any);
    for (let s = 0; s < slice.length; s++) {
      const o = slice[s];
      await repo.shipmentStop.save(repo.shipmentStop.create({
        shipmentId: shipment.id,
        sequence: s + 1,
        orderId: o.id,
        customerId: o.customerId,
        status: ['delivered', 'completed'].includes(o.status) ? 'delivered' : weighted([['arrived', 30], ['delivered', 50], ['pending', 20]]),
        arrivedAt: new Date(plannedDate.getTime() + (8 + s) * 3600 * 1000),
        departedAt: new Date(plannedDate.getTime() + (8.5 + s) * 3600 * 1000),
        deliveryNoteId: dnByOrder.get(o.id)?.id || null,
      } as any));
    }
  }
  console.log(`  [10] shipments + stops generated`);

  // ── 12. Cashbox sessions ─────────────────────────────────────
  const sessionRows: Partial<CashboxSessionEntity>[] = [];
  for (let i = 0; i < V.cashboxSessions; i++) {
    const cb = pick(allCashboxes);
    const age = randomBetween(1, 720);
    const day = daysAgo(age);
    const opening = randomBetween(5_000, 30_000);
    const sales = randomBetween(20_000, 250_000);
    const diff = Math.random() > 0.85 ? randomBetween(-1000, 1000) : 0;
    sessionRows.push({
      cashboxId: cb.id,
      openedBy: adminUser.id,
      openedAt: new Date(day.setHours(8, 0, 0, 0)),
      closedBy: adminUser.id,
      closedAt: new Date(new Date(day).setHours(20, 0, 0, 0)),
      openingBalance: opening,
      closingBalance: opening + sales + diff,
      expectedBalance: opening + sales,
      difference: diff,
      notes: diff !== 0 ? `Diferencia ${diff > 0 ? 'positiva' : 'negativa'} de $${Math.abs(diff)}` : null,
    } as any);
  }
  for (const b of chunk(sessionRows, 500)) await repo.cashboxSession.insert(b);
  console.log(`  [12] cashbox sessions: ${sessionRows.length}`);

  // ── 13. Audit events (synthetic) ─────────────────────────────
  const auditRows: Partial<AuditEventEntity>[] = [];
  const actions: Array<[string, string, number]> = [
    ['order', 'created', 15], ['order', 'confirmed', 10], ['order', 'dispatched', 8], ['order', 'delivered', 8], ['order', 'completed', 6], ['order', 'cancelled', 2],
    ['customer', 'created', 5], ['customer', 'updated', 8],
    ['product', 'created', 3], ['product', 'updated', 5],
    ['invoice', 'issued', 8], ['invoice', 'created', 5],
    ['payment', 'registered', 6], ['payment', 'applied', 6],
    ['user', 'login', 10], ['user', 'logout', 5],
    ['cashbox_session', 'opened', 3], ['cashbox_session', 'closed', 3],
    ['stock', 'adjustment', 2],
    ['shipment', 'created', 2], ['shipment', 'completed', 2],
  ];
  const actionPairs: Array<[{ entity: string; action: string }, number]> = actions.map(([entity, action, w]) => [{ entity, action }, w]);
  for (let i = 0; i < V.auditEvents; i++) {
    const { entity, action } = weighted(actionPairs);
    const actor = pick([...users, adminUser]);
    let entityId: string;
    switch (entity) {
      case 'order': entityId = orders.length ? pick(orders).id : adminUser.id; break;
      case 'customer': entityId = pick(customers).id; break;
      case 'product': entityId = pick(products).id; break;
      case 'invoice': entityId = invoices.length ? pick(invoices).id : pick(orders).id; break;
      case 'payment': entityId = pick(customers).id; break;
      case 'user': entityId = actor.id; break;
      default: entityId = adminUser.id;
    }
    auditRows.push({
      actor_type: 'user',
      actor_id: actor.id,
      action,
      entity_type: entity,
      entity_id: entityId,
      result: action === 'login' && Math.random() < 0.05 ? 'failure' : 'success',
      ip_address: `192.168.${randomBetween(1, 5)}.${randomBetween(2, 254)}`,
      metadata: { source: 'seed', synthetic: true },
      createdAt: daysAgo(randomBetween(0, 720)),
    } as any);
  }
  for (const b of chunk(auditRows, 500)) await repo.audit.insert(b);
  console.log(`  [13] audit events: ${auditRows.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 2 — Promociones, Notas crédito/débito, Hojas de ruta, Picking, Comisiones
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 14. Promotions ──────────────────────────────────────────
  const promoRows: Partial<PromotionEntity>[] = [];
  const promoKinds = ['discount_pct', 'discount_amount', 'nx+m', 'combo', 'price_override'];
  const now = new Date();
  const promotions: PromotionEntity[] = [];
  for (let i = 0; i < V.promotions; i++) {
    const kind = pick(promoKinds);
    const isActive = i < Math.floor(V.promotions * 0.6);
    const validFrom = isActive ? daysAgo(randomBetween(5, 90)) : daysAgo(randomBetween(180, 540));
    const validTo = isActive ? daysFromNow(randomBetween(30, 180)) : daysAgo(randomBetween(30, 180));
    const status = validTo.getTime() < now.getTime() ? 'expired' : isActive ? 'active' : 'draft';
    const p = await save1<PromotionEntity>(repo.promotion, {
      code: `PROMO-${String(i + 1).padStart(4, '0')}`,
      name: pick(['2x1', '3x2', 'Combo Pack', 'Descuento Mayorista', 'Black Friday', 'Semana del Padre', 'Liquidación', 'Nuevo Cliente', 'Cierre de Mes', 'Navidad']) + ` ${kind}`,
      kind,
      validFrom,
      validTo,
      channel: pick(['mayorista', 'minorista', 'gastronomia', null]),
      customerCategory: pick(['A', 'B', 'C', null]),
      minQty: kind === 'nx+m' ? randomBetween(2, 6) : 1,
      priority: randomBetween(0, 100),
      status,
    });
    promotions.push(p);
  }
  const promoItemRows: Partial<PromotionItemEntity>[] = [];
  for (const p of promotions) {
    const targets = pickMany(products, randomBetween(2, 6));
    for (const prod of targets) {
      const base: Partial<PromotionItemEntity> = { promotionId: p.id, productId: prod.id };
      switch (p.kind) {
        case 'discount_pct': base.discountPct = randomBetween(5, 30); break;
        case 'discount_amount': base.discountAmount = randomBetween(100, 2000); break;
        case 'nx+m': base.buyQty = p.minQty; base.getQty = 1; break;
        case 'combo': base.discountPct = randomBetween(10, 20); break;
        case 'price_override': base.overridePrice = Math.round(Number(prod.basePrice) * 0.7); break;
      }
      promoItemRows.push(base);
    }
  }
  for (const b of chunk(promoItemRows, 500)) await repo.promotionItem.insert(b);
  console.log(`  [14] promotions: ${promotions.length} + ${promoItemRows.length} items`);

  // ── 15. Credit notes ────────────────────────────────────────
  const issuedForCN = invoices.slice(0, Math.min(V.creditNotes, invoices.length));
  let cnNumber = 1;
  for (const inv of issuedForCN) {
    const ratio = 0.1 + Math.random() * 0.5;
    const subtotal = Math.round(Number(inv.subtotal) * ratio);
    const taxes = Math.round(Number(inv.taxes) * ratio);
    const total = subtotal + taxes;
    const issueDate = new Date((inv.issueDate || new Date()).getTime() + randomBetween(5, 60) * 86400000);
    const cn = await save1<CreditNoteEntity>(repo.creditNote, {
      number: `NC-0001-${String(cnNumber++).padStart(8, '0')}`,
      salesPoint: '00001',
      invoiceType: inv.invoiceType || 'A',
      issueDate,
      customerId: inv.customerId,
      originalInvoiceId: inv.id,
      subtotal, taxes, total,
      reason: pick(['Devolución de mercadería', 'Bonificación comercial', 'Error de facturación', 'Descuento posterior', 'Diferencia de precio']),
      status: weighted([['issued', 60], ['applied', 30], ['pending_issue', 5], ['cancelled', 5]]),
      cae: String(randomBetween(10_000_000_000_000, 99_999_999_999_999)),
      caeExpiration: daysFromNow(10),
    });
    const items = orderItemsMap.get(inv.orderId!) || [];
    const picked = items.slice(0, randomBetween(1, Math.min(3, Math.max(1, items.length))));
    for (const it of picked) {
      await repo.creditNoteItem.save(repo.creditNoteItem.create({
        creditNoteId: cn.id,
        productId: it.productId,
        description: `Devolución producto`,
        quantity: Math.max(1, Math.floor(it.quantity * 0.5)),
        unitPrice: it.unitPrice,
        discount: 0,
        tax: Math.round(it.unitPrice * 0.21),
        subtotal: Math.round(it.unitPrice * Math.max(1, Math.floor(it.quantity * 0.5))),
      } as any));
    }
  }
  console.log(`  [15] credit notes: ${issuedForCN.length}`);

  // ── 16. Debit notes ─────────────────────────────────────────
  const issuedForDN = invoices.slice(invoices.length - V.debitNotes);
  let dnNumberDeb = 1;
  for (const inv of issuedForDN) {
    const ratio = 0.05 + Math.random() * 0.2;
    const subtotal = Math.round(Number(inv.subtotal) * ratio);
    const taxes = Math.round(Number(inv.taxes) * ratio);
    const total = subtotal + taxes;
    const issueDate = new Date((inv.issueDate || new Date()).getTime() + randomBetween(10, 90) * 86400000);
    const dn = await save1<DebitNoteEntity>(repo.debitNote, {
      number: `ND-0001-${String(dnNumberDeb++).padStart(8, '0')}`,
      salesPoint: '00001',
      invoiceType: inv.invoiceType || 'A',
      issueDate,
      customerId: inv.customerId,
      originalInvoiceId: inv.id,
      subtotal, taxes, total,
      reason: pick(['Intereses por mora', 'Ajuste de precio', 'Gastos administrativos', 'Diferencia de facturación']),
      status: weighted([['issued', 70], ['applied', 20], ['cancelled', 10]]),
      cae: String(randomBetween(10_000_000_000_000, 99_999_999_999_999)),
      caeExpiration: daysFromNow(10),
    });
    await repo.debitNoteItem.save(repo.debitNoteItem.create({
      debitNoteId: dn.id,
      description: 'Ajuste comercial',
      quantity: 1,
      unitPrice: subtotal,
      discount: 0,
      tax: taxes,
      subtotal,
    } as any));
  }
  console.log(`  [16] debit notes: ${issuedForDN.length}`);

  // ── 17. Dispatch sheets ─────────────────────────────────────
  const dispatchRows: Partial<DispatchSheetEntity>[] = [];
  for (let i = 0; i < V.dispatchSheets; i++) {
    const date = daysAgo(randomBetween(1, 720));
    dispatchRows.push({
      date,
      vehicleId: pick(vehicles).id,
      driverId: pick(drivers).id,
      warehouseId: pick(physicalWarehouses).id,
      status: weighted([['closed', 60], ['dispatched', 25], ['printed', 10], ['draft', 5]]),
      notes: Math.random() < 0.2 ? 'Reparto mañana' : null,
    });
  }
  for (const b of chunk(dispatchRows, 500)) await repo.dispatchSheet.insert(b);
  console.log(`  [17] dispatch sheets: ${dispatchRows.length}`);

  // ── 18. Picking tasks ───────────────────────────────────────
  const pickingCandidates = orders.filter((o) => ['in_preparation', 'ready_to_dispatch', 'dispatched', 'delivered', 'completed'].includes(o.status));
  let pickingCount = 0;
  for (let i = 0; i < Math.min(V.pickingTasks, pickingCandidates.length); i++) {
    const o = pickingCandidates[i];
    const items = orderItemsMap.get(o.id) || [];
    if (items.length === 0) continue;
    const isDone = ['dispatched', 'delivered', 'completed'].includes(o.status);
    const status = isDone ? 'staged' : weighted([['pending', 20], ['assigned', 20], ['in_progress', 30], ['picked', 30]]);
    const startedAt = status !== 'pending' ? new Date(o.createdAt.getTime() + 2 * 3600 * 1000) : null;
    const completedAt = ['picked', 'staged'].includes(status) ? new Date(o.createdAt.getTime() + 5 * 3600 * 1000) : null;
    const task = await save1<PickingTaskEntity>(repo.pickingTask, {
      orderId: o.id,
      warehouseId: baseWarehouse.id,
      assignedTo: pick(users).id,
      status,
      startedAt,
      completedAt,
      priority: randomBetween(0, 5),
    });
    for (const it of items) {
      await repo.pickingTaskItem.save(repo.pickingTaskItem.create({
        pickingTaskId: task.id,
        productId: it.productId,
        requestedQty: it.quantity,
        pickedQty: ['picked', 'staged'].includes(status) ? it.quantity : (status === 'in_progress' ? Math.floor(it.quantity * 0.5) : 0),
        status: ['picked', 'staged'].includes(status) ? 'picked' : (status === 'in_progress' ? 'picked' : 'pending'),
      } as any));
    }
    pickingCount++;
  }
  console.log(`  [18] picking tasks: ${pickingCount}`);

  // ── 19. Commissions ─────────────────────────────────────────
  const commissionRows: Partial<CommissionEntity>[] = [];
  const completedOrders = orders.filter((o) => ['delivered', 'completed'].includes(o.status) && o.sellerId);
  for (const o of completedOrders) {
    const rate = weighted<number>([[2, 20], [3, 50], [4, 20], [5, 10]]);
    const baseAmount = Number(o.subtotal);
    const amount = Math.round(baseAmount * rate / 100);
    const isPaid = o.status === 'completed' && Math.random() < 0.7;
    const inv = invoices.find((i) => i.orderId === o.id);
    commissionRows.push({
      sellerId: o.sellerId,
      orderId: o.id,
      invoiceId: inv?.id || null,
      baseAmount,
      rate,
      amount,
      status: isPaid ? 'paid' : weighted([['accrued', 60], ['approved', 35], ['reversed', 5]]),
      accruedAt: o.createdAt,
      paidAt: isPaid ? new Date(o.createdAt.getTime() + 30 * 86400000) : null,
    });
  }
  for (const b of chunk(commissionRows, 500)) await repo.commission.insert(b);
  console.log(`  [19] commissions: ${commissionRows.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 3 — Lotes, Conteos, Payment batches, Supplier ops, Retenciones, Devoluciones
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 20. Lots + stock by lot ─────────────────────────────────
  const lotProducts = pickMany(products, V.productsWithLots);
  const lotRows: Partial<LotEntity>[] = [];
  const sblRows: Partial<StockByLotEntity>[] = [];
  for (const p of lotProducts) {
    for (let i = 0; i < V.lotsPerProduct; i++) {
      const receivedDaysAgo = randomBetween(5, 400);
      const shelfDays = randomBetween(180, 730);
      const expiration = new Date(Date.now() + (shelfDays - receivedDaysAgo) * 86400000);
      const code = `L-${p.sku}-${String(i + 1).padStart(3, '0')}`;
      const lot = await save1<LotEntity>(repo.lot, {
        productId: p.id,
        code,
        manufactureDate: daysAgo(receivedDaysAgo + 30),
        expirationDate: expiration,
        supplierId: pick(suppliers).id,
        receivedAt: daysAgo(receivedDaysAgo),
        status: expiration.getTime() < Date.now() ? 'expired' : 'active',
      });
      const wh = pick(physicalWarehouses);
      sblRows.push({
        productId: p.id,
        lotId: lot.id,
        warehouseId: wh.id,
        qty: randomBetween(10, 150),
      });
    }
  }
  for (const b of chunk(sblRows, 500)) await repo.stockByLot.insert(b);
  console.log(`  [20] lots: ${lotProducts.length * V.lotsPerProduct} + ${sblRows.length} stock_by_lot`);

  // ── 21. Inventory counts ───────────────────────────────────
  for (let i = 0; i < V.inventoryCounts; i++) {
    const daysBack = randomBetween(7, 360);
    const wh = pick(physicalWarehouses);
    const status = daysBack > 14 ? 'applied' : weighted([['counted', 40], ['in_progress', 30], ['approved', 30]]);
    const count = await save1<InventoryCountEntity>(repo.inventoryCount, {
      warehouseId: wh.id,
      kind: pick(['cycle', 'full', 'spot']),
      scope: { source: 'seed', note: 'Conteo programado' },
      status,
      startedAt: daysAgo(daysBack),
      approvedBy: status !== 'in_progress' ? adminUser.id : null,
      approvedAt: status !== 'in_progress' ? daysAgo(daysBack - 1) : null,
    });
    const countedProducts = pickMany(products, randomBetween(15, 40));
    const lineRows: Partial<InventoryCountLineEntity>[] = [];
    for (const p of countedProducts) {
      const system = randomBetween(20, 200);
      const counted = status === 'in_progress' ? null : system + (Math.random() > 0.8 ? randomBetween(-5, 5) : 0);
      lineRows.push({
        inventoryCountId: count.id,
        productId: p.id,
        systemQty: system,
        countedQty: counted,
        difference: counted !== null ? counted - system : null,
        reasonCode: counted !== null && counted !== system ? pick(['broken', 'miscount', 'theft', 'shrinkage']) : null,
      });
    }
    await repo.inventoryCountLine.insert(lineRows);
  }
  console.log(`  [21] inventory counts: ${V.inventoryCounts}`);

  // ── 22. Payment batches + orders ───────────────────────────
  const paymentOrderRows: Partial<PaymentOrderEntity>[] = [];
  for (let i = 0; i < V.paymentBatches; i++) {
    const daysBack = randomBetween(5, 540);
    const total = randomBetween(50_000, 1_500_000);
    const batch = await save1<PaymentBatchEntity>(repo.paymentBatch, {
      bankAccountId: pick(bankAccounts).id,
      date: daysAgo(daysBack),
      status: daysBack > 30 ? 'processed' : weighted([['draft', 30], ['processed', 70]]),
      total,
      fileUrl: daysBack > 30 ? `s3://erp-batches/batch-${i + 1}.txt` : null,
    });
    for (let j = 0; j < V.paymentOrdersPerBatch; j++) {
      paymentOrderRows.push({
        supplierId: pick(suppliers).id,
        date: daysAgo(daysBack),
        currency: 'ARS',
        total: Math.round(total / V.paymentOrdersPerBatch),
        status: daysBack > 30 ? 'paid' : 'approved',
        paymentBatchId: batch.id,
      });
    }
  }
  for (const b of chunk(paymentOrderRows, 500)) await repo.paymentOrder.insert(b);
  console.log(`  [22] payment batches: ${V.paymentBatches} + ${paymentOrderRows.length} orders`);

  // ── 23. Supplier delivery notes ────────────────────────────
  const sdnRows: Partial<SupplierDeliveryNoteEntity>[] = [];
  for (let i = 0; i < V.supplierDeliveryNotes; i++) {
    const daysBack = randomBetween(5, 700);
    sdnRows.push({
      supplierId: pick(suppliers).id,
      supplierDeliveryNoteNumber: `R-${String(randomBetween(10_000, 99_999))}-${String(randomBetween(10_000_000, 99_999_999))}`,
      warehouseId: pick(physicalWarehouses).id,
      receivedAt: daysAgo(daysBack),
      status: weighted([['closed', 80], ['received', 15], ['discrepancy', 5]]),
    });
  }
  for (const b of chunk(sdnRows, 500)) await repo.supplierDeliveryNote.insert(b);
  console.log(`  [23] supplier delivery notes: ${sdnRows.length}`);

  // ── 24. Supplier claims ─────────────────────────────────────
  const claimRows: Partial<SupplierClaimEntity>[] = [];
  for (let i = 0; i < V.supplierClaims; i++) {
    const daysBack = randomBetween(2, 540);
    const status = daysBack > 30 ? weighted([['resolved', 60], ['credit_received', 25], ['rejected', 15]]) : weighted([['open', 40], ['sent', 40], ['acknowledged', 20]]);
    const resolved = ['resolved', 'credit_received', 'rejected'].includes(status);
    claimRows.push({
      supplierId: pick(suppliers).id,
      kind: pick(['short_qty', 'damaged', 'wrong_sku', 'overpricing', 'missing_cae']),
      amount: randomBetween(5_000, 200_000),
      status,
      openedBy: adminUser.id,
      openedAt: daysAgo(daysBack),
      resolvedAt: resolved ? daysAgo(Math.max(1, daysBack - randomBetween(5, 20))) : null,
      notes: pick(['Faltante en recepción', 'Mercadería dañada', 'SKU incorrecto', 'Precio distinto a cotización', null]),
    });
  }
  for (const b of chunk(claimRows, 500)) await repo.supplierClaim.insert(b);
  console.log(`  [24] supplier claims: ${claimRows.length}`);

  // ── 25. Withholdings ────────────────────────────────────────
  const withholdingRows: Partial<WithholdingEntity>[] = [];
  for (let i = 0; i < V.withholdings; i++) {
    const direction = weighted([['suffered', 60], ['applied', 40]]);
    const daysBack = randomBetween(5, 540);
    withholdingRows.push({
      kind: pick(['iibb', 'ganancias', 'iva', 'suss']),
      direction,
      amount: randomBetween(500, 50_000),
      certificateNumber: `${randomBetween(100_000_000, 999_999_999)}`,
      date: daysAgo(daysBack),
      customerId: direction === 'applied' ? pick(customers).id : null,
      supplierId: direction === 'suffered' ? pick(suppliers).id : null,
    });
  }
  for (const b of chunk(withholdingRows, 500)) await repo.withholding.insert(b);
  console.log(`  [25] withholdings: ${withholdingRows.length}`);

  // ── 26. Returns ─────────────────────────────────────────────
  const deliveredOrders = orders.filter((o) => ['delivered', 'completed'].includes(o.status));
  let returnsCount = 0;
  for (let i = 0; i < Math.min(V.returns, deliveredOrders.length); i++) {
    const o = deliveredOrders[Math.floor((i / V.returns) * deliveredOrders.length)];
    if (!o) continue;
    const items = orderItemsMap.get(o.id) || [];
    if (items.length === 0) continue;
    const kind = pick(['damaged', 'expired', 'rejected_by_customer', 'commercial', 'not_delivered']);
    const status = weighted([['closed', 50], ['inspected', 20], ['received', 15], ['confirmed', 10], ['cancelled', 5]]);
    const ret = await save1<ReturnOrderEntity>(repo.returnOrder, {
      customerId: o.customerId,
      originalOrderId: o.id,
      kind,
      status,
      receivedAt: ['received', 'inspected', 'closed'].includes(status) ? new Date(o.createdAt.getTime() + 5 * 86400000) : null,
      warehouseId: baseWarehouse.id,
      notes: kind === 'damaged' ? 'Mercadería con daño externo' : null,
    });
    const picked = items.slice(0, Math.min(2, items.length));
    for (const it of picked) {
      await repo.returnOrderItem.save(repo.returnOrderItem.create({
        returnOrderId: ret.id,
        productId: it.productId,
        quantity: Math.max(1, Math.floor(it.quantity * 0.3)),
        reasonCode: kind,
        condition: kind === 'damaged' ? 'damaged' : kind === 'expired' ? 'expired' : 'resellable',
      } as any));
    }
    returnsCount++;
  }
  console.log(`  [26] returns: ${returnsCount}`);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ─── Large demo summary (${elapsed}s) ───`);
  console.log(`  Users: ${users.length + 1} | Customers: ${customers.length} | Suppliers: ${suppliers.length}`);
  console.log(`  Products: ${products.length} | Brands: ${brands.length} | Price lists: ${priceLists.length}`);
  console.log(`  Orders: ${orders.length} | Invoices: ${invoices.length} | Delivery notes: ${dnByOrder.size}`);
  console.log(`  Payments: ${paymentRows.length} | Checks: ${checkRows.length} | Cashbox sessions: ${sessionRows.length}`);
  console.log(`  Audit events: ${auditRows.length} | Stock movements: ${initialMovementRows.length + saleMovementRows.length}`);
  console.log(`  Promos: ${promotions.length} | Credit notes: ${issuedForCN.length} | Debit notes: ${issuedForDN.length}`);
  console.log(`  Dispatch sheets: ${dispatchRows.length} | Picking tasks: ${pickingCount} | Commissions: ${commissionRows.length}`);
  console.log(`  Lots: ${lotProducts.length * V.lotsPerProduct} | Inventory counts: ${V.inventoryCounts} | Payment batches: ${V.paymentBatches}`);
  console.log(`  Supplier DN: ${sdnRows.length} | Supplier claims: ${claimRows.length} | Withholdings: ${withholdingRows.length} | Returns: ${returnsCount}`);
}
