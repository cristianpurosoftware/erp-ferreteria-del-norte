import { AppDataSource } from '../../config/data-source';
import { withTransaction } from '../../common/transaction';
import { OrderEntity } from './data_access/order.entity';
import { OrderItemEntity } from './data_access/order-item.entity';
import { CustomerEntity } from '../customers/data_access/customer.entity';
import { PriceListItemEntity } from '../price-lists/data_access/price-list-item.entity';
import { ProductEntity } from '../products/data_access/product.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError, ForbiddenError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { OrderEvents } from './orders.events';
import { checkCredit } from '../customers/customers.service';
import { logger } from '../../common/logger';

const log = logger.child({ context: { layer: 'service', module: 'orders' } });

const orderRepo = AppDataSource.getRepository(OrderEntity);
const itemRepo = AppDataSource.getRepository(OrderItemEntity);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveToUUID(identifier: string): Promise<string> {
  if (UUID_REGEX.test(identifier)) return identifier;
  const normalized = /^N\d+$/i.test(identifier) ? identifier.slice(1) : identifier;
  const num = parseInt(normalized, 10);
  if (isNaN(num)) throw new NotFoundError('Pedido no encontrado');
  const [row] = await AppDataSource.query(
    `SELECT id::text AS id FROM orders WHERE number = $1 AND deleted_at IS NULL`,
    [num]
  );
  if (!row) throw new NotFoundError('Pedido no encontrado');
  return row.id;
}

const TRANSITIONS: TransitionMap<string> = {
  draft: ['pending_confirmation', 'cancelled'],
  pending_confirmation: ['confirmed', 'rejected'],
  confirmed: ['stock_reserved', 'cancelled'],
  stock_reserved: ['in_preparation', 'cancelled'],
  in_preparation: ['ready_to_dispatch', 'cancelled'],
  ready_to_dispatch: ['dispatched', 'cancelled'],
  dispatched: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  rejected: [],
};

function calculateItemSubtotal(item: { quantity: number; unitPrice: number; discount?: number; tax?: number }) {
  const discount = item.discount || 0;
  const tax = item.tax || 0;
  return item.quantity * item.unitPrice - discount + tax;
}

function calculateTotals(items: Array<{ quantity: number; unitPrice: number; discount?: number; tax?: number; subtotal: number }>) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const discounts = items.reduce((sum, i) => sum + (i.discount || 0), 0);
  const taxes = items.reduce((sum, i) => sum + (i.tax || 0), 0);
  const total = subtotal - discounts + taxes;
  return { subtotal, discounts, taxes, total };
}

const ORDER_COLUMNS: ColumnMap = {
  number: { type: 'number', column: 'number' },
  status: { type: 'enum', column: 'status' },
  channel: { type: 'enum', column: 'channel' },
  zoneId: { type: 'enum', column: 'zoneId' },
  routeId: { type: 'enum', column: 'routeId' },
  customerId: { type: 'enum', column: 'customerId' },
  sellerId: { type: 'enum', column: 'sellerId' },
  branchId: { type: 'enum', column: 'branchId' },
  operationType: { type: 'enum', column: 'operationType' },
  customerName: { type: 'string', sql: 'COALESCE(c.commercial_name, c.legal_name)' },
  total: { type: 'number', column: 'total' },
  createdAt: { type: 'date', column: 'createdAt' },
};

const ORDER_SORTABLE: SortableMap = {
  number: 'o.number',
  status: 'o.status',
  total: 'o.total',
  createdAt: 'o.createdAt',
  customerName: 'COALESCE(c.commercial_name, c.legal_name)',
};

const ORDER_SEARCH = [
  'o.number',
  'COALESCE(c.commercial_name, c.legal_name)',
];

function buildOrdersQB() {
  return orderRepo.createQueryBuilder('o')
    .leftJoin('customers', 'c', 'c.id::text = o.customer_id')
    .leftJoin('users', 'u', 'u.id::text = o.seller_id');
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildOrdersQB()
    .addSelect('COALESCE(c.commercial_name, c.legal_name)', 'customerName')
    .addSelect("CONCAT(u.first_name, ' ', u.last_name)", 'sellerName')
    .addSelect('(SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id)', 'itemCount');

  query.applyTo(qb, 'o', ORDER_COLUMNS, ORDER_SORTABLE, ORDER_SEARCH, {
    field: 'createdAt',
    direction: 'DESC',
  });

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    customerName: raw[i]?.customerName ?? null,
    sellerName: raw[i]?.sellerName?.trim() ?? null,
    itemCount: Number(raw[i]?.itemCount ?? 0),
  }));
  return { items, meta: query.buildMeta(total) };
}

/**
 * Aggregate counters for the orders header — respects the same filters as
 * findAll, but doesn't paginate. Use for tiny JSON responses
 * (`{ total, totalAmount, byStatus }`) instead of shipping all rows to the
 * client to compute sums locally.
 */
export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);

  const totalsQb = buildOrdersQB()
    .select('COUNT(o.id)', 'total')
    .addSelect('COALESCE(SUM(o.total), 0)', 'totalAmount');
  query.applyFilters(totalsQb, 'o', ORDER_COLUMNS, ORDER_SEARCH);
  const totals = await totalsQb.getRawOne();

  const byStatusQb = buildOrdersQB()
    .select('o.status', 'status')
    .addSelect('COUNT(o.id)', 'count')
    .groupBy('o.status');
  query.applyFilters(byStatusQb, 'o', ORDER_COLUMNS, ORDER_SEARCH);
  const byStatusRows = await byStatusQb.getRawMany();

  return {
    total: Number(totals?.total ?? 0),
    totalAmount: Number(totals?.totalAmount ?? 0),
    byStatus: byStatusRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = Number(r.count);
      return acc;
    }, {}),
  };
}

export async function findById(id: string) {
  const qb = orderRepo.createQueryBuilder('o')
    .leftJoinAndSelect('o.items', 'items')
    .leftJoin('customers', 'c', 'c.id::text = o.customer_id')
    .leftJoin('users', 'u', 'u.id::text = o.seller_id')
    .leftJoin('branches', 'b', 'b.id::text = o.branch_id')
    .addSelect("COALESCE(c.commercial_name, c.legal_name)", 'customerName')
    .addSelect("CONCAT(u.first_name, ' ', u.last_name)", 'sellerName')
    .addSelect('b.name', 'branchName')
    .where('o.id = :id', { id });

  const result = await qb.getRawAndEntities();
  const entity = result.entities[0];
  if (!entity) throw new NotFoundError('Pedido no encontrado');

  // Resolve product names for items
  const productIds = entity.items?.map(i => i.productId).filter(Boolean) ?? [];
  let productMap: Record<string, string> = {};
  if (productIds.length > 0) {
    const products = await AppDataSource.query(
      `SELECT id::text, name FROM products WHERE id::text = ANY($1)`,
      [productIds]
    );
    for (const p of products) {
      productMap[p.id] = p.name;
    }
  }

  return {
    ...entity,
    customerName: result.raw[0]?.customerName ?? null,
    sellerName: result.raw[0]?.sellerName?.trim() ?? null,
    branchName: result.raw[0]?.branchName ?? null,
    items: entity.items?.map(i => ({
      ...i,
      productName: productMap[i.productId] ?? null,
    })),
  };
}

interface PriceResolution {
  unitPrice: number;
  listPrice: number | null; // null means "no list price found — caller set it freely"
  overridden: boolean;
}

async function resolvePriceForItem(
  priceListId: string | null,
  productId: string,
  quantity: number,
  requestedUnitPrice: number | undefined,
  product: ProductEntity | null,
): Promise<PriceResolution> {
  // Find the list price if the customer has a price list.
  let listPrice: number | null = null;
  if (priceListId) {
    const row = await AppDataSource.getRepository(PriceListItemEntity)
      .createQueryBuilder('pli')
      .where('pli.price_list_id = :plId', { plId: priceListId })
      .andWhere('pli.product_id = :pid', { pid: productId })
      .andWhere('pli.min_quantity <= :q', { q: quantity })
      .andWhere('(pli.valid_from IS NULL OR pli.valid_from <= NOW())')
      .andWhere('(pli.valid_to IS NULL OR pli.valid_to >= NOW())')
      .orderBy('pli.min_quantity', 'DESC')
      .getOne();
    if (row) listPrice = Number(row.price);
  }
  // Fall back to product.basePrice if no list price found.
  if (listPrice === null && product) {
    listPrice = Number(product.basePrice ?? 0);
    if (listPrice <= 0) listPrice = null;
  }

  if (requestedUnitPrice == null) {
    if (listPrice === null) {
      throw new BusinessLogicError(
        'PRICE_NOT_RESOLVED',
        `No price list, no base price: unitPrice is required for product ${productId}`,
      );
    }
    return { unitPrice: listPrice, listPrice, overridden: false };
  }

  // Price explicit in the request. Overridden iff it differs from list.
  const overridden = listPrice !== null && Math.abs(requestedUnitPrice - listPrice) > 0.005;
  return { unitPrice: requestedUnitPrice, listPrice, overridden };
}

export async function create(data: any, userPermissions: string[] = []) {
  const customer = await AppDataSource.getRepository(CustomerEntity).findOne({
    where: { id: data.customerId },
  });
  if (!customer) throw new NotFoundError('Cliente no encontrado');

  const productIds: string[] = data.items.map((i: any) => i.productId);
  const products = await AppDataSource.getRepository(ProductEntity).find({
    where: productIds.map((id) => ({ id })),
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const canOverride = userPermissions.includes('orders:override_price');
  const priceOverrides: Array<{
    productId: string;
    listPrice: number | null;
    actualPrice: number;
    delta: number;
  }> = [];

  const enrichedItems = await Promise.all(
    data.items.map(async (i: any) => {
      const resolution = await resolvePriceForItem(
        customer.priceListId ?? null,
        i.productId,
        Number(i.quantity),
        i.unitPrice != null ? Number(i.unitPrice) : undefined,
        productById.get(i.productId) ?? null,
      );

      if (resolution.overridden) {
        if (!canOverride) {
          throw new ForbiddenError(
            `Price override for product ${i.productId} requires orders:override_price`,
          );
        }
        priceOverrides.push({
          productId: i.productId,
          listPrice: resolution.listPrice,
          actualPrice: resolution.unitPrice,
          delta: resolution.unitPrice - (resolution.listPrice ?? 0),
        });
      }

      return { ...i, unitPrice: resolution.unitPrice };
    }),
  );

  const items: OrderItemEntity[] = enrichedItems.map((i: any) => {
    const discount = i.discount || 0;
    const tax = i.tax || 0;
    const subtotal = calculateItemSubtotal(i);
    return itemRepo.create({ ...i, discount, tax, subtotal }) as unknown as OrderItemEntity;
  });

  const totals = calculateTotals(items);

  const order = orderRepo.create({
    customerId: data.customerId,
    branchId: data.branchId,
    sellerId: data.sellerId,
    channel: data.channel,
    estimatedDeliveryDate: data.estimatedDeliveryDate,
    notes: data.notes,
    status: 'draft',
    items,
    ...totals,
  });

  const saved = await orderRepo.save(order);

  if (priceOverrides.length > 0) {
    log.warn('Price overrides applied to order', {
      method: 'create',
      orderId: saved.id,
      customerId: saved.customerId,
      overrideCount: priceOverrides.length,
      overrides: priceOverrides,
    });
  }

  log.info('Order created', {
    method: 'create',
    orderId: saved.id,
    customerId: saved.customerId,
    itemCount: saved.items.length,
    total: saved.total,
    status: saved.status,
  });

  eventBus.emit(OrderEvents.CREATED, {
    ...saved,
    priceOverrides: priceOverrides.length > 0 ? priceOverrides : undefined,
  });
  return saved;
}

export async function update(id: string, data: any) {
  return withTransaction(async (em) => {
    const orderTx = em.getRepository(OrderEntity);
    const itemTx = em.getRepository(OrderItemEntity);

    const order = await orderTx.findOne({ where: { id }, relations: ['items'] });
    if (!order) throw new NotFoundError('Pedido no encontrado');
    if (order.status !== 'draft') {
      throw new BusinessLogicError('INVALID_OPERATION', 'El pedido solo puede modificarse en estado borrador');
    }

    if (data.notes !== undefined) order.notes = data.notes;
    if (data.estimatedDeliveryDate !== undefined) order.estimatedDeliveryDate = data.estimatedDeliveryDate;

    if (data.items) {
      await itemTx.delete({ orderId: id });
      const items = data.items.map((i: any) => {
        const discount = i.discount || 0;
        const tax = i.tax || 0;
        const subtotal = calculateItemSubtotal(i);
        return itemTx.create({ ...i, discount, tax, subtotal, orderId: id });
      });
      await itemTx.save(items);
      order.items = items;
      const totals = calculateTotals(items);
      Object.assign(order, totals);
    }

    const saved = await orderTx.save(order);
    log.info('Order updated', { method: 'update', orderId: id });
    return saved;
  });
}

async function transitionTo(id: string, newStatus: string, event: string) {
  const order = await findById(id);
  const from = order.status;
  assertTransition(TRANSITIONS, from, newStatus, 'order');
  order.status = newStatus;
  const saved = await orderRepo.save(order);
  log.info('Order status updated', { method: 'transitionTo', orderId: id, from, to: newStatus });
  eventBus.emit(event, saved);
  return saved;
}

export async function submit(id: string) {
  const order = await findById(id);
  const credit = await checkCredit(order.customerId, Number(order.total ?? 0));
  if (!credit.ok) {
    eventBus.emit(OrderEvents.BLOCKED_BY_CREDIT, {
      orderId: order.id,
      customerId: order.customerId,
      total: order.total,
      reason: credit.reason,
      detail: credit.detail,
    });
    throw new BusinessLogicError(
      'CREDIT_BLOCK',
      credit.reason === 'policy_blocked'
        ? 'El crédito del cliente está bloqueado por política'
        : credit.reason === 'over_credit_limit'
        ? 'El pedido supera el límite de crédito del cliente'
        : 'El cliente tiene saldo vencido y block_on_overdue está activo',
      { reason: credit.reason, ...credit.detail },
    );
  }
  return transitionTo(id, 'pending_confirmation', OrderEvents.SUBMITTED);
}

export async function confirm(id: string) {
  return transitionTo(id, 'confirmed', OrderEvents.CONFIRMED);
}

export async function reject(id: string) {
  return transitionTo(id, 'rejected', OrderEvents.REJECTED);
}

export async function reserveStock(id: string) {
  return transitionTo(id, 'stock_reserved', OrderEvents.STOCK_RESERVED);
}

export async function startPreparation(id: string) {
  return transitionTo(id, 'in_preparation', OrderEvents.PREPARATION_STARTED);
}

export async function readyToDispatch(id: string) {
  return transitionTo(id, 'ready_to_dispatch', OrderEvents.READY_TO_DISPATCH);
}

export async function dispatch(id: string) {
  return transitionTo(id, 'dispatched', OrderEvents.DISPATCHED);
}

export async function deliver(id: string) {
  return transitionTo(id, 'delivered', OrderEvents.DELIVERED);
}

export async function complete(id: string) {
  return transitionTo(id, 'completed', OrderEvents.COMPLETED);
}

export async function cancel(id: string) {
  return transitionTo(id, 'cancelled', OrderEvents.CANCELLED);
}
