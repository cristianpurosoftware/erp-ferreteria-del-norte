import { AppDataSource } from '../../config/data-source';
import { withTransaction } from '../../common/transaction';
import { PosSaleEntity } from './data_access/pos-sale.entity';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { PosEvents } from './pos.events';
import { logger } from '../../common/logger';
import { createMovement } from '../inventory/inventory.service';
import { create as createPayment } from '../payments/payments.service';
import { create as createInvoice, issue as issueInvoice, findById as findInvoiceById } from '../invoices/invoices.service';
import { requestCaeForInvoice } from '../fiscal-authorizations/fiscal-authorizations.service';
import { createEntry } from '../accounts/accounts.service';
import { StockEntity } from '../inventory/data_access/stock.entity';
import type { CreatePosSaleInput } from './pos.schema';

const log = logger.child({ context: { layer: 'service', module: 'pos' } });
const repo = AppDataSource.getRepository(PosSaleEntity);

const CONSUMIDOR_FINAL_TAX_ID = 'CF-00000000';

type PosInvoice = Awaited<ReturnType<typeof findInvoiceById>>;

function presentPosInvoice(invoice: PosInvoice | null) {
  if (!invoice) return null;
  return {
    ...invoice,
    type: invoice.invoiceType,
  };
}

const POS_SALE_SELECT = `
  SELECT
    s.id::text AS id,
    s.customer_id AS "customerId",
    s.order_id AS "orderId",
    s.invoice_id AS "invoiceId",
    s.warehouse_id AS "warehouseId",
    s.user_id AS "userId",
    s.subtotal::float AS subtotal,
    s.discount::float AS discount,
    s.taxes::float AS taxes,
    s.total::float AS total,
    s.payment_breakdown AS "paymentBreakdown",
    s.status AS status,
    s.created_at AS "createdAt",
    s.updated_at AS "updatedAt",
    s.deleted_at AS "deletedAt",
    s.metadata AS metadata,
    o.number AS "orderNumber",
    COALESCE(c.commercial_name, c.legal_name, 'Consumidor Final') AS "customerName",
    i.number AS "invoiceNumber",
    i.invoice_type AS "invoiceType",
    i.sales_point AS "salesPoint",
    i.status AS "invoiceStatus",
    i.cae AS cae,
    i.cae_expiration AS "caeExpiration"
  FROM pos_sales s
  LEFT JOIN orders o ON o.id = s.order_id
  LEFT JOIN customers c ON c.id = COALESCE(s.customer_id, o.customer_id)
  LEFT JOIN invoices i ON i.id = s.invoice_id
`;

async function hydrateSale(sale: PosSaleEntity) {
  const invoice = sale.invoiceId ? await findInvoiceById(sale.invoiceId) : null;
  const [order] = await AppDataSource.query(
    `SELECT
       o.id::text AS id,
       o.number AS number,
       o.customer_id AS "customerId",
       o.subtotal::float AS subtotal,
       o.discounts::float AS discounts,
       o.taxes::float AS taxes,
       o.total::float AS total,
       COALESCE(c.commercial_name, c.legal_name, 'Consumidor Final') AS "customerName"
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.id = $1
     LIMIT 1`,
    [sale.orderId],
  );
  const items = await AppDataSource.query(
    `SELECT
       oi.id::text AS id,
       oi.product_id AS "productId",
       COALESCE(p.sku, '') AS sku,
       COALESCE(p.name, oi.product_id) AS name,
       oi.quantity::float AS quantity,
       oi.unit_price::float AS "unitPrice",
       oi.discount::float AS discount,
       oi.tax::float AS tax,
       oi.subtotal::float AS subtotal
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.created_at ASC`,
    [sale.orderId],
  );

  return { sale, invoice: presentPosInvoice(invoice), order: order ?? null, items };
}

// Lazily creates (or fetches) the canonical "Consumidor Final" customer used
// when a POS sale has no nominated customer. The orders table requires
// customer_id NOT NULL, so we always need a real customer row.
async function getOrCreateConsumidorFinalId(): Promise<string> {
  const [existing] = await AppDataSource.query<Array<{ id: string }>>(
    `SELECT id FROM customers WHERE tax_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [CONSUMIDOR_FINAL_TAX_ID],
  );
  if (existing) return existing.id;
  const [created] = await AppDataSource.query<Array<{ id: string }>>(
    `INSERT INTO customers (
       id, created_at, updated_at, customer_type, legal_name, commercial_name,
       tax_id, tax_condition, status, credit_limit, credit_policy, block_on_overdue
     ) VALUES (
       'cust_' || substr(md5(random()::text), 1, 12),
       now(), now(), 'individual', 'Consumidor Final', 'Consumidor Final',
       $1, 'consumidor_final', 'active', 0, 'normal', false
     ) RETURNING id`,
    [CONSUMIDOR_FINAL_TAX_ID],
  );
  log.info('Created canonical "Consumidor Final" customer', { customerId: created.id });
  return created.id;
}

/**
 * Returns today's sales for the calling cashier, ordered newest first.
 */
export async function listRecent(limit = 100) {
  return AppDataSource.query(`${POS_SALE_SELECT} ORDER BY s.created_at DESC LIMIT $1`, [limit]);
}

export async function listToday(_userId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return AppDataSource.query(`${POS_SALE_SELECT} WHERE s.created_at >= $1 ORDER BY s.created_at DESC`, [startOfDay]);
}

async function getSaleEntity(id: string) {
  const sale = await repo.findOne({ where: { id } });
  if (!sale) throw new NotFoundError('Venta POS no encontrada');
  return sale;
}

export async function getOne(id: string) {
  const sale = await getSaleEntity(id);
  return hydrateSale(sale);
}

/**
 * Atomically creates a POS sale:
 *  1. Validates each item has enough stock in the chosen warehouse.
 *  2. Creates an Order (status='confirmed', direct POS channel).
 *  3. Decrements stock per line via inventory.createMovement.
 *  4. Creates one Payment per payment method in the breakdown.
 *  5. If method='account' and customerId is set, charges the customer current account.
 *  6. Creates and issues an Invoice type 'B' — triggers fiscal-authorizations listener for CAE.
 *  7. Persists PosSaleEntity. Emits pos_sale.completed.
 *  8. Returns the PosSale + invoice.
 */
export async function createSale(data: CreatePosSaleInput, userId: string) {
  // ── 1. Pre-flight: stock check (outside tx, read-only snapshot) ────────────
  for (const item of data.items) {
    const stock = await AppDataSource.getRepository(StockEntity).findOne({
      where: { productId: item.productId, warehouseId: data.warehouseId },
    });
    const available = Number(stock?.availableQty ?? 0);
    if (available < item.quantity) {
      throw new BusinessLogicError(
        'INSUFFICIENT_STOCK',
        `Stock insuficiente para el producto ${item.productId}. Disponible: ${available}, solicitado: ${item.quantity}`,
        { productId: item.productId, available, requested: item.quantity },
      );
    }
  }

  // ── 2. Compute totals ──────────────────────────────────────────────────────
  const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const discount = data.items.reduce((sum, i) => sum + (i.discount ?? 0), 0);
  const taxes = data.items.reduce((sum, i) => sum + (i.tax ?? 0), 0);
  const total = subtotal - discount + taxes;

  const paymentTotal = data.payments.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(paymentTotal - total) > 0.01) {
    throw new BusinessLogicError(
      'PAYMENT_MISMATCH',
      `El total de medios de pago (${paymentTotal}) no coincide con el total de la venta (${total})`,
      { paymentTotal, saleTotal: total },
    );
  }

  // ── 3. Resolve customer (default to Consumidor Final) and persist Order ───
  const effectiveCustomerId = data.customerId ?? (await getOrCreateConsumidorFinalId());

  const [orderRow] = await AppDataSource.query<Array<{ id: string }>>(
    `INSERT INTO orders (
       id, created_at, updated_at, metadata,
       customer_id, status, channel, subtotal, discounts, taxes, total, number
     ) VALUES (
       uuid_generate_v4(), now(), now(), NULL,
       $1, 'confirmed', 'pos',
       $2, $3, $4, $5,
       (SELECT COALESCE(MAX(number), 0) + 1 FROM orders)
     ) RETURNING id::text AS id`,
    [effectiveCustomerId, subtotal, discount, taxes, total],
  );
  const orderId: string = orderRow.id;

  // Insert order items
  for (const item of data.items) {
    const lineSubtotal = item.quantity * item.unitPrice - (item.discount ?? 0) + (item.tax ?? 0);
    await AppDataSource.query(
      `INSERT INTO order_items (
         id, created_at, updated_at, metadata,
         order_id, product_id, quantity, unit_price,
         discount, tax, subtotal
       ) VALUES (
         uuid_generate_v4(), now(), now(), NULL,
         $1, $2, $3, $4, $5, $6, $7
       )`,
      [orderId, item.productId, item.quantity, item.unitPrice, item.discount ?? 0, item.tax ?? 0, lineSubtotal],
    );
  }

  // ── 4. Decrement stock per line ────────────────────────────────────────────
  for (const item of data.items) {
    await createMovement({
      type: 'outbound',
      productId: item.productId,
      sourceWarehouseId: data.warehouseId,
      quantity: item.quantity,
      reason: 'Venta POS',
      reasonCode: 'pos_sale',
      referenceType: 'pos_sale',
      referenceId: orderId,
    });
  }

  // ── 5. Create one Payment per method ──────────────────────────────────────
  const savedPayments = await Promise.all(
    data.payments.map((p) =>
      createPayment({
        type: 'in',
        direction: 'in',
        paymentMethod: p.method,
        amount: p.amount,
        customerId: data.customerId ?? undefined,
        status: 'applied',
        notes: `Venta POS - orden ${orderId}`,
        invoiceId: undefined, // will be set below if we need it
      }),
    ),
  );

  // ── 6. If method='account', charge customer current account ───────────────
  if (data.customerId) {
    for (const p of data.payments) {
      if (p.method === 'account') {
        await createEntry({
          entityType: 'customer',
          entityId: data.customerId,
          type: 'debit',
          concept: `Venta POS - orden ${orderId}`,
          amount: p.amount,
          referenceType: 'order',
          referenceId: orderId,
        });
      }
    }
  }

  // ── 7. Create and issue Invoice B ─────────────────────────────────────────
  // POS sales bypass the manual review queue: invoice goes straight from
  // creation to 'pending_issue', so issue() can transition to 'issued'
  // (state machine: draft → pending_issue → issued).
  const invoice = await createInvoice({
    orderId,
    customerId: effectiveCustomerId,
    invoiceType: 'B',
    subtotal,
    taxes,
    total,
    status: 'pending_issue',
    notes: data.notes ?? null,
  } as any);

  // Transition to issued. No global listener wires invoice.issued →
  // fiscal-authorizations.requestCaeForInvoice yet, so the POS service
  // calls it explicitly. With AFIP_SANDBOX_STUB=true (default in demos)
  // this synthesises a fake CAE locally; in prod it will hit WSFE.
  await issueInvoice(invoice.id);
  await requestCaeForInvoice(invoice.id).catch((err) => {
    log.warn('CAE request failed (non-fatal in demo)', { invoiceId: invoice.id, err: String(err) });
  });
  const issuedInvoice = await findInvoiceById(invoice.id);

  // ── 8. Persist PosSale ────────────────────────────────────────────────────
  const sale = await withTransaction(async (em) => {
    const saleTx = em.getRepository(PosSaleEntity);
    const entity = saleTx.create({
      customerId: data.customerId ?? null,
      orderId,
      invoiceId: issuedInvoice.id,
      warehouseId: data.warehouseId,
      userId,
      subtotal,
      discount,
      taxes,
      total,
      paymentBreakdown: data.payments.map((p) => ({ method: p.method, amount: p.amount })),
      status: 'completed',
      voidedAt: null,
      voidedBy: null,
    });
    return saleTx.save(entity);
  });

  log.info('POS sale created', {
    method: 'createSale',
    posSaleId: sale.id,
    orderId,
    invoiceId: issuedInvoice.id,
    userId,
    total,
    paymentMethods: data.payments.map((p) => p.method),
  });

  eventBus.emit(PosEvents.COMPLETED, { sale, invoice: presentPosInvoice(issuedInvoice), payments: savedPayments });

  return { sale, invoice: presentPosInvoice(issuedInvoice) };
}

/**
 * Void a POS sale. For demo: flips status to 'voided' and logs.
 * Full reversal (inverse stock movements, invoice void) is intentionally
 * deferred — the stub is enough for the demo.
 */
export async function voidSale(id: string, userId: string) {
  const sale = await getSaleEntity(id);

  if (sale.status === 'voided') {
    throw new BusinessLogicError('ALREADY_VOIDED', 'Esta venta ya fue anulada');
  }

  sale.status = 'voided';
  sale.voidedAt = new Date();
  sale.voidedBy = userId;

  const saved = await repo.save(sale);

  log.info('POS sale voided', {
    method: 'voidSale',
    posSaleId: id,
    userId,
  });

  eventBus.emit(PosEvents.VOIDED, saved);

  return saved;
}
