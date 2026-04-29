import { AppDataSource } from '../../../src/config/data-source';
import { CustomerEntity } from '../../../src/modules/customers/data_access/customer.entity';
import { ProductEntity } from '../../../src/modules/products/data_access/product.entity';
import { WarehouseEntity } from '../../../src/modules/warehouses/data_access/warehouse.entity';
import { BranchEntity } from '../../../src/modules/branches/data_access/branch.entity';
import { StockEntity } from '../../../src/modules/inventory/data_access/stock.entity';
import { AccountEntity } from '../../../src/modules/accounts/data_access/account.entity';

export async function seedBranch(overrides: Partial<BranchEntity> = {}) {
  const repo = AppDataSource.getRepository(BranchEntity);
  const row = repo.create({
    name: 'Casa Central',
    code: 'CC01',
    address: 'Test 123',
    ...overrides,
  } as any);
  return repo.save(row) as unknown as BranchEntity;
}

export async function seedWarehouse(branchId: string, overrides: Partial<WarehouseEntity> = {}) {
  const repo = AppDataSource.getRepository(WarehouseEntity);
  const row = repo.create({
    branchId,
    name: 'Depósito test',
    type: 'main',
    status: 'active',
    ...overrides,
  } as any);
  return repo.save(row) as unknown as WarehouseEntity;
}

export async function seedProduct(overrides: Partial<ProductEntity> = {}) {
  const repo = AppDataSource.getRepository(ProductEntity);
  const row = repo.create({
    name: 'Test product',
    sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productType: 'physical',
    basePrice: 100,
    baseCost: 50,
    controlsStock: true,
    status: 'active',
    ...overrides,
  });
  return repo.save(row);
}

export async function seedCustomer(overrides: Partial<CustomerEntity> = {}) {
  const repo = AppDataSource.getRepository(CustomerEntity);
  const row = repo.create({
    legalName: 'Test customer SA',
    commercialName: 'Test customer',
    status: 'active',
    creditLimit: 0,
    creditPolicy: 'normal',
    blockOnOverdue: false,
    overdueDaysThreshold: 30,
    ...overrides,
  });
  return repo.save(row);
}

export async function seedStock(productId: string, warehouseId: string, availableQty: number) {
  const repo = AppDataSource.getRepository(StockEntity);
  const row = repo.create({
    productId,
    warehouseId,
    variantId: null,
    availableQty,
    reservedQty: 0,
    inTransitQty: 0,
    minStock: 0,
  });
  return repo.save(row);
}

export async function getAccountByEntity(entityType: string, entityId: string) {
  return AppDataSource.getRepository(AccountEntity).findOne({
    where: { entityType, entityId },
  });
}
