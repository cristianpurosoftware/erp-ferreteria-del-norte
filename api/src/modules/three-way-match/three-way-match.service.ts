import { AppDataSource } from '../../config/data-source';
import { ThreeWayMatchEntity } from './data_access/three-way-match.entity';
import { SupplierInvoiceEntity } from '../supplier-invoices/data_access/supplier-invoice.entity';
import { PurchaseOrderEntity } from '../purchases/data_access/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../purchases/data_access/purchase-order-item.entity';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { ThreeWayMatchEvents } from './three-way-match.events';
import * as supplierInvoicesService from '../supplier-invoices/supplier-invoices.service';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(ThreeWayMatchEntity);
const supInvRepo = AppDataSource.getRepository(SupplierInvoiceEntity);
const poRepo = AppDataSource.getRepository(PurchaseOrderEntity);
const poItemRepo = AppDataSource.getRepository(PurchaseOrderItemEntity);

const DEFAULT_TOLERANCE_PCT = Number(process.env.THREE_WAY_MATCH_QTY_TOLERANCE_PCT ?? '0');

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Verificación de tres vías no encontrada');
  return item;
}

export async function runMatch(supplierInvoiceId: string) {
  const invoice = await supInvRepo.findOne({ where: { id: supplierInvoiceId }, relations: ['items'] });
  if (!invoice) return null;
  if (!invoice.purchaseOrderId) return null;

  const po = await poRepo.findOne({ where: { id: invoice.purchaseOrderId } });
  if (!po) return null;
  const poItems = await poItemRepo.find({ where: { purchaseOrderId: invoice.purchaseOrderId } });

  const discrepancies: any[] = [];
  for (const invItem of invoice.items) {
    if (!invItem.purchaseOrderItemId) continue;
    const poItem = poItems.find((p) => p.id === invItem.purchaseOrderItemId);
    if (!poItem) {
      discrepancies.push({ type: 'missing_po_item', supplier_invoice_item_id: invItem.id });
      continue;
    }
    const qtyDelta = Number(invItem.quantity) - Number(poItem.quantity);
    const tolerance = Math.abs(Number(poItem.quantity)) * DEFAULT_TOLERANCE_PCT / 100;
    if (Math.abs(qtyDelta) > tolerance) {
      discrepancies.push({
        type: 'qty_mismatch',
        field: 'quantity',
        po: poItem.quantity,
        inv: invItem.quantity,
        delta: qtyDelta,
      });
    }
    if (Number(invItem.unitCost) !== Number(poItem.unitCost)) {
      discrepancies.push({
        type: 'unit_cost_mismatch',
        field: 'unit_cost',
        po: poItem.unitCost,
        inv: invItem.unitCost,
        delta: Number(invItem.unitCost) - Number(poItem.unitCost),
      });
    }
  }

  const status = discrepancies.length === 0 ? 'matched' : 'discrepancy';
  const existing = await repo.findOne({ where: { supplierInvoiceId, purchaseOrderId: invoice.purchaseOrderId } });

  let record: ThreeWayMatchEntity;
  if (existing) {
    existing.discrepancies = discrepancies;
    existing.status = status;
    record = await repo.save(existing);
  } else {
    const newRecord = repo.create({
      purchaseOrderId: invoice.purchaseOrderId,
      supplierInvoiceId,
      discrepancies,
      status,
    });
    record = await repo.save(newRecord);
  }

  if (status === 'matched') {
    eventBus.emit(ThreeWayMatchEvents.MATCHED, record);
    try {
      await supplierInvoicesService.markMatched(supplierInvoiceId);
    } catch (e) {
      logger.error({ err: e, matchId: record.id, supplierInvoiceId }, 'Failed to mark supplier invoice matched');
    }
  } else {
    eventBus.emit(ThreeWayMatchEvents.DISCREPANCY, record);
  }

  logger.info({ action: 'create', matchId: record.id, supplierInvoiceId, purchaseOrderId: record.purchaseOrderId, status }, 'Three-way match run');
  return record;
}

export async function override(id: string, userId: string, reason: string, notes?: string) {
  const record = await findById(id);
  const from = record.status;
  record.status = 'overridden';
  record.overriddenBy = userId;
  record.overriddenAt = new Date();
  record.notes = [reason, notes].filter(Boolean).join(' - ');
  const saved = await repo.save(record);
  eventBus.emit(ThreeWayMatchEvents.OVERRIDDEN, saved);
  try {
    await supplierInvoicesService.markMatched(saved.supplierInvoiceId);
  } catch (e) {
    logger.error({ err: e, matchId: id, supplierInvoiceId: saved.supplierInvoiceId }, 'Failed to mark supplier invoice matched after override');
  }
  logger.info({ action: 'transition', matchId: id, from, to: 'overridden', overriddenBy: userId }, 'Three-way match overridden');
  return saved;
}
