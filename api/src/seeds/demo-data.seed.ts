import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/data-source';
import { CustomerEntity } from '../modules/customers/data_access/customer.entity';
import { ContactEntity } from '../modules/customers/data_access/contact.entity';
import { AddressEntity } from '../modules/customers/data_access/address.entity';
import { ProductEntity } from '../modules/products/data_access/product.entity';
import { BrandEntity } from '../modules/brands/data_access/brand.entity';
import { CategoryEntity } from '../modules/categories/data_access/category.entity';
import { PriceListEntity } from '../modules/price-lists/data_access/price-list.entity';
import { PriceListItemEntity } from '../modules/price-lists/data_access/price-list-item.entity';
import { OrderEntity } from '../modules/orders/data_access/order.entity';
import { OrderItemEntity } from '../modules/orders/data_access/order-item.entity';
import { StockEntity } from '../modules/inventory/data_access/stock.entity';
import { StockMovementEntity } from '../modules/inventory/data_access/stock-movement.entity';
import { AccountEntity } from '../modules/accounts/data_access/account.entity';
import { AccountEntryEntity } from '../modules/accounts/data_access/account-entry.entity';
import { PaymentEntity } from '../modules/payments/data_access/payment.entity';
import { InvoiceEntity } from '../modules/invoices/data_access/invoice.entity';
import { SupplierEntity } from '../modules/suppliers/data_access/supplier.entity';
import { PurchaseOrderEntity } from '../modules/purchases/data_access/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../modules/purchases/data_access/purchase-order-item.entity';
import { CashboxSessionEntity } from '../modules/cashbox/data_access/cashbox-session.entity';
import { CashboxEntity } from '../modules/cashbox/data_access/cashbox.entity';
import { AuditEventEntity } from '../modules/audit/data_access/audit-event.entity';
import { UserEntity } from '../modules/users/data_access/user.entity';
import { RoleEntity } from '../modules/roles/data_access/role.entity';
import { WarehouseEntity } from '../modules/warehouses/data_access/warehouse.entity';
import { BranchEntity } from '../modules/branches/data_access/branch.entity';
import { InvoiceTypeEntity } from '../modules/invoice-types/data_access/invoice-type.entity';

// ─── Helpers ──────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main seed ────────────────────────────────────────────────

export async function seedDemoData() {
  const customerRepo = AppDataSource.getRepository(CustomerEntity);
  const contactRepo = AppDataSource.getRepository(ContactEntity);
  const addressRepo = AppDataSource.getRepository(AddressEntity);
  const productRepo = AppDataSource.getRepository(ProductEntity);
  const brandRepo = AppDataSource.getRepository(BrandEntity);
  const categoryRepo = AppDataSource.getRepository(CategoryEntity);
  const priceListRepo = AppDataSource.getRepository(PriceListEntity);
  const priceListItemRepo = AppDataSource.getRepository(PriceListItemEntity);
  const orderRepo = AppDataSource.getRepository(OrderEntity);
  const orderItemRepo = AppDataSource.getRepository(OrderItemEntity);
  const stockRepo = AppDataSource.getRepository(StockEntity);
  const movementRepo = AppDataSource.getRepository(StockMovementEntity);
  const accountRepo = AppDataSource.getRepository(AccountEntity);
  const entryRepo = AppDataSource.getRepository(AccountEntryEntity);
  const paymentRepo = AppDataSource.getRepository(PaymentEntity);
  const invoiceRepo = AppDataSource.getRepository(InvoiceEntity);
  const supplierRepo = AppDataSource.getRepository(SupplierEntity);
  const poRepo = AppDataSource.getRepository(PurchaseOrderEntity);
  const poItemRepo = AppDataSource.getRepository(PurchaseOrderItemEntity);
  const cashboxSessionRepo = AppDataSource.getRepository(CashboxSessionEntity);
  const cashboxRepo = AppDataSource.getRepository(CashboxEntity);
  const auditRepo = AppDataSource.getRepository(AuditEventEntity);
  const userRepo = AppDataSource.getRepository(UserEntity);
  const roleRepo = AppDataSource.getRepository(RoleEntity);
  const warehouseRepo = AppDataSource.getRepository(WarehouseEntity);
  const branchRepo = AppDataSource.getRepository(BranchEntity);
  const invoiceTypeRepo = AppDataSource.getRepository(InvoiceTypeEntity);

  // Skip if demo data already exists
  const existingOrders = await orderRepo.count();
  if (existingOrders > 0) {
    console.log('  Demo data already exists, skipping...');
    return;
  }

  // ─── Lookup existing data ─────────────────────────────────

  const branch = await branchRepo.findOne({ where: {} });
  if (!branch) throw new Error('No branch found. Run company seed first.');

  const warehouse = await warehouseRepo.findOne({ where: {} });
  if (!warehouse) throw new Error('No warehouse found. Run company seed first.');

  const adminRole = await roleRepo.findOneBy({ name: 'admin' });
  const ventasRole = await roleRepo.findOneBy({ name: 'ventas' });
  const operacionesRole = await roleRepo.findOneBy({ name: 'operaciones' });
  const adminUser = await userRepo.findOne({ where: {} });
  if (!adminUser) throw new Error('No admin user found. Run admin seed first.');

  const invoiceTypeA = await invoiceTypeRepo.findOneBy({ code: 'FA' });
  const invoiceTypeB = await invoiceTypeRepo.findOneBy({ code: 'FB' });

  // ─── 1. Additional users ──────────────────────────────────

  const passwordHash = await bcrypt.hash('demo1234', 10);

  const sellers: UserEntity[] = [];
  const sellerData = [
    { first_name: 'Carlos', last_name: 'Mendez', email: 'carlos@demo.com', roleId: ventasRole!.id },
    { first_name: 'Laura', last_name: 'Gomez', email: 'laura@demo.com', roleId: ventasRole!.id },
    { first_name: 'Martin', last_name: 'Rodriguez', email: 'martin@demo.com', roleId: ventasRole!.id },
    { first_name: 'Pablo', last_name: 'Fernandez', email: 'pablo@demo.com', roleId: operacionesRole!.id },
    { first_name: 'Ana', last_name: 'Lopez', email: 'ana@demo.com', roleId: operacionesRole!.id },
  ];

  for (const sd of sellerData) {
    let u = await userRepo.findOneBy({ email: sd.email });
    if (!u) {
      u = await userRepo.save(userRepo.create({ ...sd, password_hash: passwordHash, status: 'active' }));
    }
    sellers.push(u);
  }
  console.log('  Users created:', sellers.length);

  // ─── 2. Brands ────────────────────────────────────────────

  const brandNames = ['Arcor', 'Marolio', 'La Serenisima', 'Unilever', 'P&G', 'Quilmes', 'Coca-Cola', 'Molinos'];
  const brands: BrandEntity[] = [];
  for (const name of brandNames) {
    let b = await brandRepo.findOneBy({ name });
    if (!b) b = await brandRepo.save(brandRepo.create({ name, status: 'active' }));
    brands.push(b);
  }
  console.log('  Brands created:', brands.length);

  // ─── 3. Products (25 products) ────────────────────────────

  const categories = await categoryRepo.find();
  const catMap = new Map(categories.map((c) => [c.name, c.id]));

  const productDefs = [
    { name: 'Agua mineral 500ml', sku: 'AGUA-500', basePrice: 500, baseCost: 250, cat: 'Bebidas', brand: 'La Serenisima' },
    { name: 'Agua mineral 1.5L', sku: 'AGUA-1500', basePrice: 850, baseCost: 420, cat: 'Bebidas', brand: 'La Serenisima' },
    { name: 'Coca-Cola 2.25L', sku: 'COCA-225', basePrice: 2200, baseCost: 1100, cat: 'Bebidas', brand: 'Coca-Cola' },
    { name: 'Coca-Cola 500ml', sku: 'COCA-500', basePrice: 1200, baseCost: 600, cat: 'Bebidas', brand: 'Coca-Cola' },
    { name: 'Cerveza Quilmes 1L', sku: 'QUILMES-1L', basePrice: 2500, baseCost: 1250, cat: 'Bebidas', brand: 'Quilmes' },
    { name: 'Cerveza Quilmes 473ml', sku: 'QUILMES-473', basePrice: 1500, baseCost: 750, cat: 'Bebidas', brand: 'Quilmes' },
    { name: 'Galletitas Pepitos 118g', sku: 'GAL-PEP', basePrice: 950, baseCost: 475, cat: 'Alimentos', brand: 'Arcor' },
    { name: 'Alfajor Aguila triple', sku: 'ALF-AGUILA', basePrice: 800, baseCost: 400, cat: 'Alimentos', brand: 'Arcor' },
    { name: 'Fideos Matarazzo 500g', sku: 'FID-MAT', basePrice: 1100, baseCost: 550, cat: 'Alimentos', brand: 'Molinos' },
    { name: 'Arroz Molinos Ala 1kg', sku: 'ARR-ALA', basePrice: 1800, baseCost: 900, cat: 'Alimentos', brand: 'Molinos' },
    { name: 'Aceite Girasol Cocinero 1.5L', sku: 'ACE-COC', basePrice: 3200, baseCost: 1600, cat: 'Alimentos', brand: 'Molinos' },
    { name: 'Leche entera La Serenisima 1L', sku: 'LECHE-LS', basePrice: 1400, baseCost: 700, cat: 'Alimentos', brand: 'La Serenisima' },
    { name: 'Yogur Natural 200g', sku: 'YOG-NAT', basePrice: 900, baseCost: 450, cat: 'Alimentos', brand: 'La Serenisima' },
    { name: 'Dulce de leche 400g', sku: 'DDL-400', basePrice: 2100, baseCost: 1050, cat: 'Alimentos', brand: 'La Serenisima' },
    { name: 'Mermelada de durazno 454g', sku: 'MERM-DUR', basePrice: 1600, baseCost: 800, cat: 'Alimentos', brand: 'Arcor' },
    { name: 'Tomate triturado 520g', sku: 'TOM-520', basePrice: 750, baseCost: 375, cat: 'Alimentos', brand: 'Marolio' },
    { name: 'Atun en aceite 170g', sku: 'ATUN-170', basePrice: 1900, baseCost: 950, cat: 'Alimentos', brand: 'Marolio' },
    { name: 'Jabon liquido Ala 800ml', sku: 'JAB-ALA', basePrice: 1500, baseCost: 750, cat: 'Limpieza', brand: 'Unilever' },
    { name: 'Detergente Skip 800ml', sku: 'DET-SKIP', basePrice: 2800, baseCost: 1400, cat: 'Limpieza', brand: 'Unilever' },
    { name: 'Lavandina Ayudin 1L', sku: 'LAV-AYU', basePrice: 600, baseCost: 300, cat: 'Limpieza', brand: 'P&G' },
    { name: 'Suavizante Comfort 900ml', sku: 'SUAV-COM', basePrice: 2200, baseCost: 1100, cat: 'Limpieza', brand: 'Unilever' },
    { name: 'Papel higienico Elite x4', sku: 'PAP-ELITE', basePrice: 1800, baseCost: 900, cat: 'Limpieza', brand: 'P&G' },
    { name: 'Servilletas Elegante x100', sku: 'SERV-100', basePrice: 700, baseCost: 350, cat: 'Limpieza', brand: 'P&G' },
    { name: 'Bolsa residuos 45x60 x30', sku: 'BOL-4560', basePrice: 500, baseCost: 250, cat: 'Limpieza', brand: 'Marolio' },
    { name: 'Esponja multiuso x3', sku: 'ESP-X3', basePrice: 400, baseCost: 200, cat: 'Limpieza', brand: 'P&G' },
  ];

  const products: ProductEntity[] = [];
  for (const pd of productDefs) {
    let p = await productRepo.findOneBy({ sku: pd.sku });
    if (!p) {
      const brandId = brands.find((b) => b.name === pd.brand)?.id || null;
      const categoryId = catMap.get(pd.cat) || null;
      p = await productRepo.save(productRepo.create({
        name: pd.name,
        sku: pd.sku,
        basePrice: pd.basePrice,
        baseCost: pd.baseCost,
        brandId,
        categoryId,
        status: 'active',
        productType: 'physical',
        controlsStock: true,
        minStock: randomBetween(5, 20),
      }));
    }
    products.push(p);
  }
  console.log('  Products created:', products.length);

  // ─── 4. Price lists ───────────────────────────────────────

  let listaMayorista = await priceListRepo.findOneBy({ name: 'Mayorista' });
  if (!listaMayorista) {
    listaMayorista = await priceListRepo.save(priceListRepo.create({
      name: 'Mayorista',
      currency: 'ARS',
      status: 'active',
      isDefault: true,
    }));
  }

  let listaMinorista = await priceListRepo.findOneBy({ name: 'Minorista' });
  if (!listaMinorista) {
    listaMinorista = await priceListRepo.save(priceListRepo.create({
      name: 'Minorista',
      currency: 'ARS',
      status: 'active',
      isDefault: false,
    }));
  }

  for (const p of products) {
    // Mayorista: 10% less than base
    const existingM = await priceListItemRepo.findOneBy({ priceListId: listaMayorista.id, productId: p.id });
    if (!existingM) {
      await priceListItemRepo.save(priceListItemRepo.create({
        priceListId: listaMayorista.id,
        productId: p.id,
        price: Math.round(Number(p.basePrice) * 0.9),
        minQuantity: 1,
      }));
    }
    // Minorista: 20% more than base
    const existingR = await priceListItemRepo.findOneBy({ priceListId: listaMinorista.id, productId: p.id });
    if (!existingR) {
      await priceListItemRepo.save(priceListItemRepo.create({
        priceListId: listaMinorista.id,
        productId: p.id,
        price: Math.round(Number(p.basePrice) * 1.2),
        minQuantity: 1,
      }));
    }
  }
  console.log('  Price lists created with items');

  // ─── 5. Customers (15 customers) ─────────────────────────

  const customerDefs = [
    { legalName: 'Distribuidora Norte S.A.', commercialName: 'Dist. Norte', taxId: '30-12345678-9', taxCondition: 'Responsable Inscripto', channel: 'mayorista', creditLimit: 500000 },
    { legalName: 'Comercial Sur S.R.L.', commercialName: 'Com. Sur', taxId: '30-98765432-1', taxCondition: 'Responsable Inscripto', channel: 'mayorista', creditLimit: 350000 },
    { legalName: 'Supermercado El Sol', commercialName: 'El Sol', taxId: '20-44556677-8', taxCondition: 'Responsable Inscripto', channel: 'mayorista', creditLimit: 800000 },
    { legalName: 'Minimarket La Esquina', commercialName: 'La Esquina', taxId: '20-33445566-2', taxCondition: 'Monotributista', channel: 'minorista', creditLimit: 100000 },
    { legalName: 'Almacen Don Pedro', commercialName: 'Don Pedro', taxId: '20-11223344-5', taxCondition: 'Monotributista', channel: 'minorista', creditLimit: 80000 },
    { legalName: 'Kiosco Central', commercialName: 'Kiosco Central', taxId: '20-55667788-0', taxCondition: 'Monotributista', channel: 'minorista', creditLimit: 50000 },
    { legalName: 'Restaurante La Parrilla', commercialName: 'La Parrilla', taxId: '30-66778899-3', taxCondition: 'Responsable Inscripto', channel: 'gastronomia', creditLimit: 200000 },
    { legalName: 'Hotel Gran Via S.A.', commercialName: 'Gran Via', taxId: '30-77889900-4', taxCondition: 'Responsable Inscripto', channel: 'gastronomia', creditLimit: 600000 },
    { legalName: 'Panaderia San Martin', commercialName: 'San Martin', taxId: '20-88990011-6', taxCondition: 'Monotributista', channel: 'minorista', creditLimit: 120000 },
    { legalName: 'Dietética Vida Sana', commercialName: 'Vida Sana', taxId: '20-99001122-7', taxCondition: 'Monotributista', channel: 'minorista', creditLimit: 60000 },
    { legalName: 'Cooperativa Agraria del Este', commercialName: 'Coop. Este', taxId: '30-00112233-8', taxCondition: 'Responsable Inscripto', channel: 'mayorista', creditLimit: 400000 },
    { legalName: 'Maxiconsumo Rosario S.A.', commercialName: 'Maxiconsumo', taxId: '30-11224433-1', taxCondition: 'Responsable Inscripto', channel: 'mayorista', creditLimit: 1000000 },
    { legalName: 'Juan Perez', commercialName: null as any, taxId: '27-22334455-9', taxCondition: 'Consumidor Final', channel: 'mostrador', creditLimit: 0 },
    { legalName: 'Maria Garcia', commercialName: null as any, taxId: '27-33445566-0', taxCondition: 'Consumidor Final', channel: 'mostrador', creditLimit: 0 },
    { legalName: 'Autoservicio Barrio Norte', commercialName: 'Barrio Norte', taxId: '20-44332211-5', taxCondition: 'Monotributista', channel: 'minorista', creditLimit: 90000 },
  ];

  const customers: CustomerEntity[] = [];
  for (const cd of customerDefs) {
    let c = await customerRepo.findOneBy({ legalName: cd.legalName });
    if (!c) {
      c = await customerRepo.save(customerRepo.create({
        ...cd,
        customerType: cd.commercialName ? 'company' : 'individual',
        status: 'active',
        email: `${(cd.commercialName || cd.legalName).toLowerCase().replace(/[^a-z]/g, '')}@demo.com`,
        phone: `+54 11 ${randomBetween(4000, 4999)}-${randomBetween(1000, 9999)}`,
        assignedSellerId: pick(sellers.slice(0, 3)).id,
        priceListId: cd.channel === 'mayorista' ? listaMayorista.id : listaMinorista.id,
      }));
    }
    customers.push(c);
  }
  console.log('  Customers created:', customers.length);

  // ─── 5b. Contacts & addresses ─────────────────────────────

  for (const c of customers) {
    const existingContacts = await contactRepo.countBy({ customerId: c.id });
    if (existingContacts > 0) continue;

    await contactRepo.save(contactRepo.create({
      customerId: c.id,
      name: c.customerType === 'individual' ? c.legalName : `${pick(['Roberto', 'Silvia', 'Diego', 'Patricia', 'Sergio'])} ${pick(['Martinez', 'Gonzalez', 'Lopez', 'Diaz', 'Torres'])}`,
      position: c.customerType === 'individual' ? null : pick(['Gerente', 'Compras', 'Encargado', 'Dueño']),
      email: `contacto@${c.legalName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}.com`,
      phone: `+54 11 ${randomBetween(4000, 4999)}-${randomBetween(1000, 9999)}`,
      isPrimary: true,
    }));

    const streets = ['Av. San Martin', 'Av. Rivadavia', 'Calle Mitre', 'Belgrano', 'Sarmiento', 'Av. Corrientes', 'Lavalle', 'Tucuman', 'Av. Santa Fe', 'Av. Callao'];
    const cities = ['Buenos Aires', 'Rosario', 'Córdoba', 'Mendoza', 'La Plata', 'Mar del Plata', 'San Miguel de Tucumán'];
    const provinces = ['Buenos Aires', 'Santa Fe', 'Córdoba', 'Mendoza', 'Buenos Aires', 'Buenos Aires', 'Tucumán'];

    const cityIdx = randomBetween(0, cities.length - 1);
    await addressRepo.save(addressRepo.create({
      customerId: c.id,
      type: 'shipping',
      street: `${pick(streets)} ${randomBetween(100, 5000)}`,
      city: cities[cityIdx],
      province: provinces[cityIdx],
      country: 'Argentina',
      postalCode: `${randomBetween(1000, 9999)}`,
    }));

    if (c.customerType === 'company') {
      await addressRepo.save(addressRepo.create({
        customerId: c.id,
        type: 'billing',
        street: `${pick(streets)} ${randomBetween(100, 5000)}`,
        city: cities[cityIdx],
        province: provinces[cityIdx],
        country: 'Argentina',
        postalCode: `${randomBetween(1000, 9999)}`,
      }));
    }
  }
  console.log('  Contacts & addresses created');

  // ─── 6. Stock (initial inventory) ─────────────────────────

  for (const p of products) {
    const existing = await stockRepo.findOneBy({ productId: p.id, warehouseId: warehouse.id });
    if (!existing) {
      const qty = randomBetween(20, 200);
      await stockRepo.save(stockRepo.create({
        productId: p.id,
        warehouseId: warehouse.id,
        availableQty: qty,
        reservedQty: 0,
        inTransitQty: 0,
        minStock: p.minStock,
      }));

      await movementRepo.save(movementRepo.create({
        type: 'adjustment',
        date: daysAgo(60),
        productId: p.id,
        destWarehouseId: warehouse.id,
        quantity: qty,
        reason: 'Inventario inicial',
        referenceType: 'seed',
        userId: adminUser.id,
      }));
    }
  }
  console.log('  Stock initialized');

  // ─── 7. Suppliers ─────────────────────────────────────────

  const supplierDefs = [
    { name: 'Arcor S.A.I.C.', taxId: '30-50001111-0', primaryContact: 'Miguel Torres', email: 'ventas@arcor.com', paymentCondition: '30 dias' },
    { name: 'Marolio S.A.', taxId: '30-50002222-1', primaryContact: 'Claudia Rios', email: 'compras@marolio.com', paymentCondition: '30 dias' },
    { name: 'La Serenisima', taxId: '30-50003333-2', primaryContact: 'Fernando Paz', email: 'ventas@laserenisima.com', paymentCondition: 'Contado' },
    { name: 'Unilever Argentina', taxId: '30-50004444-3', primaryContact: 'Lucia Mendez', email: 'trade@unilever.com', paymentCondition: '60 dias' },
    { name: 'Cerveceria Quilmes', taxId: '30-50005555-4', primaryContact: 'Andres Sola', email: 'distribuidores@quilmes.com', paymentCondition: '30 dias' },
    { name: 'Coca-Cola FEMSA', taxId: '30-50006666-5', primaryContact: 'Sandra Vila', email: 'ventas@coca-cola.com', paymentCondition: '30 dias' },
    { name: 'Molinos Rio de la Plata', taxId: '30-50007777-6', primaryContact: 'Gabriel Luna', email: 'ventas@molinos.com', paymentCondition: '60 dias' },
  ];

  const suppliers: SupplierEntity[] = [];
  for (const sd of supplierDefs) {
    let s = await supplierRepo.findOneBy({ name: sd.name });
    if (!s) {
      s = await supplierRepo.save(supplierRepo.create({
        ...sd,
        phone: `+54 11 ${randomBetween(5000, 5999)}-${randomBetween(1000, 9999)}`,
        status: 'active',
      }));
    }
    suppliers.push(s);
  }
  console.log('  Suppliers created:', suppliers.length);

  // ─── 8. Orders (40 orders in various states) ──────────────

  const orderStatuses = ['draft', 'pending_confirmation', 'confirmed', 'stock_reserved', 'dispatched', 'delivered', 'completed', 'cancelled'];
  const statusWeights = [2, 3, 5, 3, 4, 6, 12, 3]; // more completed/delivered

  function weightedStatus(): string {
    const total = statusWeights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < orderStatuses.length; i++) {
      r -= statusWeights[i];
      if (r <= 0) return orderStatuses[i];
    }
    return 'completed';
  }

  const orders: OrderEntity[] = [];
  for (let i = 0; i < 40; i++) {
    const customer = pick(customers);
    const seller = pick(sellers.slice(0, 3));
    const status = weightedStatus();
    const age = status === 'completed' ? randomBetween(5, 90) : status === 'delivered' ? randomBetween(2, 30) : randomBetween(0, 15);
    const numItems = randomBetween(1, 6);
    const orderProducts = [];
    const usedIds = new Set<string>();

    for (let j = 0; j < numItems; j++) {
      let p = pick(products);
      while (usedIds.has(p.id)) p = pick(products);
      usedIds.add(p.id);
      const qty = randomBetween(1, 24);
      const unitPrice = Number(p.basePrice);
      const discount = Math.random() > 0.7 ? Math.round(unitPrice * qty * 0.05) : 0;
      const tax = Math.round((unitPrice * qty - discount) * 0.21);
      const subtotal = unitPrice * qty - discount;
      orderProducts.push({ productId: p.id, quantity: qty, unitPrice, discount, tax, subtotal });
    }

    const subtotal = orderProducts.reduce((s, i) => s + i.subtotal, 0);
    const taxes = orderProducts.reduce((s, i) => s + i.tax, 0);
    const discounts = orderProducts.reduce((s, i) => s + i.discount, 0);
    const total = subtotal + taxes;

    const order = await orderRepo.save(orderRepo.create({
      customerId: customer.id,
      branchId: branch.id,
      sellerId: seller.id,
      channel: customer.channel || 'mostrador',
      status,
      estimatedDeliveryDate: daysFromNow(randomBetween(1, 14)),
      subtotal,
      taxes,
      discounts,
      total,
      notes: Math.random() > 0.7 ? pick(['Entregar por la mañana', 'Llamar antes de entregar', 'Urgente', 'Dejar en depósito', '']) : null,
      createdAt: daysAgo(age),
    } as any)) as unknown as OrderEntity;

    for (const oi of orderProducts) {
      await orderItemRepo.save(orderItemRepo.create({
        orderId: order.id,
        ...oi,
      }));
    }

    orders.push(order);
  }
  console.log('  Orders created:', orders.length);

  // ─── 9. Customer accounts & entries ───────────────────────

  const completedOrders = orders.filter((o) => ['completed', 'delivered', 'dispatched'].includes(o.status));

  // Group completed orders by customer
  const ordersByCustomer = new Map<string, OrderEntity[]>();
  for (const o of completedOrders) {
    const arr = ordersByCustomer.get(o.customerId) || [];
    arr.push(o);
    ordersByCustomer.set(o.customerId, arr);
  }

  const accounts: AccountEntity[] = [];
  for (const c of customers) {
    let account = await accountRepo.findOneBy({ entityType: 'customer', entityId: c.id });
    if (!account) {
      account = await accountRepo.save(accountRepo.create({
        entityType: 'customer',
        entityId: c.id,
        currentBalance: 0,
        overdueBalance: 0,
        creditLimit: c.creditLimit,
      }));
    }
    accounts.push(account);

    const custOrders = ordersByCustomer.get(c.id) || [];
    let balance = 0;

    for (const order of custOrders) {
      // Debit entry for order
      balance += Number(order.total);
      await entryRepo.save(entryRepo.create({
        accountId: account.id,
        date: order.createdAt,
        type: 'debit',
        concept: `Pedido #${order.number}`,
        referenceType: 'order',
        referenceId: order.id,
        amount: Number(order.total),
        resultingBalance: balance,
        status: 'confirmed',
      }));
    }

    // Some customers have partial payments
    if (custOrders.length > 0 && Math.random() > 0.3) {
      const payAmount = Math.round(balance * (Math.random() > 0.5 ? 1 : Math.random() * 0.8 + 0.1));
      if (payAmount > 0) {
        balance -= payAmount;
        await entryRepo.save(entryRepo.create({
          accountId: account.id,
          date: daysAgo(randomBetween(0, 15)),
          type: 'credit',
          concept: 'Pago recibido',
          referenceType: 'payment',
          amount: payAmount,
          resultingBalance: balance,
          status: 'confirmed',
        }));
      }
    }

    // Update account balance with varied overdue ratios for aging demo
    account.currentBalance = balance;
    if (balance > 0) {
      // Distribute: 0% (al dia), 10-20% (15-30d), 30-40% (30-60d), 60-80% (60+d)
      const overduePatterns = [0, 0, 0.15, 0.15, 0.35, 0.35, 0.35, 0.7, 0.7];
      const ratio = pick(overduePatterns);
      account.overdueBalance = Math.round(balance * ratio);
    }
    await accountRepo.save(account);
  }
  console.log('  Accounts & entries created');

  // ─── 10. Payments ─────────────────────────────────────────

  const paymentMethods = ['cash', 'transfer', 'check', 'credit_card', 'debit_card'];
  const paymentMethodWeights = [30, 35, 10, 15, 10];

  function weightedPaymentMethod(): string {
    const total = paymentMethodWeights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < paymentMethods.length; i++) {
      r -= paymentMethodWeights[i];
      if (r <= 0) return paymentMethods[i];
    }
    return 'cash';
  }

  const payments: PaymentEntity[] = [];
  for (let i = 0; i < 30; i++) {
    const customer = pick(customers.filter((c) => c.customerType === 'company'));
    const amount = randomBetween(5000, 150000);
    const age = randomBetween(0, 60);
    const status = age > 30 ? 'applied' : age > 10 ? 'applied' : Math.random() > 0.3 ? 'applied' : 'draft';

    const payment = await paymentRepo.save(paymentRepo.create({
      type: 'collection',
      date: daysAgo(age),
      customerId: customer.id,
      paymentMethod: weightedPaymentMethod(),
      amount,
      currency: 'ARS',
      status,
      notes: Math.random() > 0.8 ? 'Pago parcial' : null,
    }));
    payments.push(payment);
  }
  console.log('  Payments created:', payments.length);

  // ─── 11. Invoices ─────────────────────────────────────────

  const invoicedOrders = orders.filter((o) => ['completed', 'delivered'].includes(o.status)).slice(0, 20);
  const invoices: InvoiceEntity[] = [];

  for (const order of invoicedOrders) {
    const customer = customers.find((c) => c.id === order.customerId);
    const isRI = customer?.taxCondition === 'Responsable Inscripto';
    const typeId = isRI ? invoiceTypeA?.id : invoiceTypeB?.id;
    const age = randomBetween(1, 60);
    const status = age > 20 ? 'issued' : Math.random() > 0.3 ? 'issued' : 'draft';

    const inv = await invoiceRepo.save(invoiceRepo.create({
      orderId: order.id,
      typeId: typeId || null,
      number: status === 'issued' ? `0001-${String(invoices.length + 1).padStart(8, '0')}` : null,
      issueDate: status === 'issued' ? daysAgo(age) : null,
      customerId: order.customerId,
      subtotal: order.subtotal,
      taxes: order.taxes,
      total: order.total,
      status,
      fiscalIntegrationStatus: status === 'issued' ? 'approved' : null,
    }));
    invoices.push(inv);
  }
  console.log('  Invoices created:', invoices.length);

  // ─── 12. Purchase orders ──────────────────────────────────

  const poStatuses = ['draft', 'approved', 'sent', 'partially_received', 'received', 'cancelled'];
  const purchaseOrders: PurchaseOrderEntity[] = [];

  for (let i = 0; i < 12; i++) {
    const supplier = pick(suppliers);
    const status = pick(['approved', 'sent', 'received', 'received', 'received', 'draft']);
    const numItems = randomBetween(2, 5);
    const poProducts: { productId: string; quantity: number; unitCost: number; subtotal: number }[] = [];
    const usedIds = new Set<string>();

    for (let j = 0; j < numItems; j++) {
      let p = pick(products);
      while (usedIds.has(p.id)) p = pick(products);
      usedIds.add(p.id);
      const qty = randomBetween(10, 100);
      const unitCost = Number(p.baseCost);
      poProducts.push({ productId: p.id, quantity: qty, unitCost, subtotal: qty * unitCost });
    }

    const subtotal = poProducts.reduce((s, i) => s + i.subtotal, 0);
    const taxes = Math.round(subtotal * 0.21);
    const total = subtotal + taxes;

    const po = await poRepo.save(poRepo.create({
      supplierId: supplier.id,
      branchId: branch.id,
      date: daysAgo(randomBetween(5, 45)),
      status,
      subtotal,
      taxes,
      total,
      notes: Math.random() > 0.7 ? 'Entrega parcial aceptada' : null,
    }));

    for (const pi of poProducts) {
      await poItemRepo.save(poItemRepo.create({ purchaseOrderId: po.id, ...pi }));
    }

    purchaseOrders.push(po);
  }
  console.log('  Purchase orders created:', purchaseOrders.length);

  // ─── 13. Cashbox sessions ─────────────────────────────────

  const cashbox = await cashboxRepo.findOne({ where: {} });
  if (cashbox) {
    for (let i = 0; i < 10; i++) {
      const age = i + 1; // last 10 days
      const openingBalance = randomBetween(5000, 20000);
      const salesAmount = randomBetween(30000, 120000);
      const closingBalance = openingBalance + salesAmount;
      const expected = closingBalance;
      const diff = Math.random() > 0.8 ? randomBetween(-500, 500) : 0;

      await cashboxSessionRepo.save(cashboxSessionRepo.create({
        cashboxId: cashbox.id,
        openedBy: adminUser.id,
        openedAt: new Date(daysAgo(age).setHours(8, 0, 0)),
        closedBy: adminUser.id,
        closedAt: new Date(daysAgo(age).setHours(20, 0, 0)),
        openingBalance,
        closingBalance: closingBalance + diff,
        expectedBalance: expected,
        difference: diff,
        notes: diff !== 0 ? `Diferencia de $${Math.abs(diff)}` : null,
      }));
    }
    console.log('  Cashbox sessions created: 10');
  }

  // ─── 14. Audit events ─────────────────────────────────────

  const auditActions = [
    { action: 'create', entity_type: 'order', result: 'success' },
    { action: 'update', entity_type: 'order', result: 'success' },
    { action: 'confirm', entity_type: 'order', result: 'success' },
    { action: 'dispatch', entity_type: 'order', result: 'success' },
    { action: 'deliver', entity_type: 'order', result: 'success' },
    { action: 'create', entity_type: 'customer', result: 'success' },
    { action: 'update', entity_type: 'customer', result: 'success' },
    { action: 'create', entity_type: 'product', result: 'success' },
    { action: 'update', entity_type: 'product', result: 'success' },
    { action: 'create', entity_type: 'payment', result: 'success' },
    { action: 'apply', entity_type: 'payment', result: 'success' },
    { action: 'login', entity_type: 'user', result: 'success' },
    { action: 'login', entity_type: 'user', result: 'failure' },
    { action: 'create', entity_type: 'invoice', result: 'success' },
    { action: 'issue', entity_type: 'invoice', result: 'success' },
    { action: 'open', entity_type: 'cashbox', result: 'success' },
    { action: 'close', entity_type: 'cashbox', result: 'success' },
    { action: 'adjustment', entity_type: 'stock', result: 'success' },
  ];

  for (let i = 0; i < 80; i++) {
    const def = pick(auditActions);
    const actor = pick([...sellers, adminUser]);
    await auditRepo.save(auditRepo.create({
      actor_type: 'user',
      actor_id: actor.id,
      action: def.action,
      entity_type: def.entity_type,
      entity_id: def.entity_type === 'order' && orders.length > 0
        ? pick(orders).id
        : def.entity_type === 'customer' && customers.length > 0
        ? pick(customers).id
        : def.entity_type === 'product' && products.length > 0
        ? pick(products).id
        : pick(orders).id,
      result: def.result,
      ip_address: '192.168.1.' + randomBetween(2, 254),
      metadata: { source: 'seed' },
      createdAt: daysAgo(randomBetween(0, 60)),
    } as any));
  }
  console.log('  Audit events created: 80');

  // ─── 15. Stock movements (recent activity) ────────────────

  for (let i = 0; i < 20; i++) {
    const p = pick(products);
    const type = pick(['sale', 'purchase', 'adjustment', 'sale', 'sale']);
    const qty = type === 'sale' ? -randomBetween(1, 10) : randomBetween(5, 50);

    await movementRepo.save(movementRepo.create({
      type,
      date: daysAgo(randomBetween(0, 30)),
      productId: p.id,
      sourceWarehouseId: type === 'sale' ? warehouse.id : null,
      destWarehouseId: type !== 'sale' ? warehouse.id : null,
      quantity: Math.abs(qty),
      reason: type === 'adjustment' ? 'Ajuste de inventario' : type === 'sale' ? 'Venta' : 'Compra',
      referenceType: type,
      userId: pick([...sellers, adminUser]).id,
    }));
  }
  console.log('  Stock movements created: 20');

  console.log('  ─── Demo data summary ───');
  console.log(`  Users: ${sellers.length + 1} | Customers: ${customers.length} | Products: ${products.length}`);
  console.log(`  Orders: ${orders.length} | Invoices: ${invoices.length} | Payments: ${payments.length}`);
  console.log(`  Suppliers: ${suppliers.length} | Purchase Orders: ${purchaseOrders.length}`);
  console.log(`  Audit events: 80 | Stock movements: 20+`);
}
