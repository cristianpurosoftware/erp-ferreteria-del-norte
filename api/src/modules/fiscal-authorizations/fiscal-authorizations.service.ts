import { AppDataSource } from '../../config/data-source';
import { FiscalAuthorizationEntity } from './data_access/fiscal-authorization.entity';
import { InvoiceEntity } from '../invoices/data_access/invoice.entity';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { FiscalAuthorizationEvents } from './fiscal-authorizations.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(FiscalAuthorizationEntity);
const invoiceRepo = AppDataSource.getRepository(InvoiceEntity);

export async function findAll(filters: { documentId?: string; documentType?: string } = {}) {
  const qb = repo.createQueryBuilder('f');
  if (filters.documentId) qb.andWhere('f.document_id = :d', { d: filters.documentId });
  if (filters.documentType) qb.andWhere('f.document_type = :t', { t: filters.documentType });
  qb.orderBy('f.requestedAt', 'DESC');
  return qb.getMany();
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Autorización fiscal no encontrada');
  return item;
}

/**
 * Stub CAE request — real implementation will live in integrations/afip.provider.ts.
 * In this baseline we simulate a granted CAE when the env flag AFIP_SANDBOX_STUB is true,
 * and log the authorization record. The invoice gets cae/cae_expiration populated and
 * status moves to issued.
 */
export async function requestCaeForInvoice(invoiceId: string) {
  const invoice = await invoiceRepo.findOne({ where: { id: invoiceId } });
  if (!invoice) throw new NotFoundError('Factura no encontrada');

  if (!invoice.invoiceType) {
    throw new BusinessLogicError('CAE_NOT_APPLICABLE', 'El tipo de comprobante no está configurado');
  }

  const auth = repo.create({
    documentType: 'invoice',
    documentId: invoice.id,
    provider: 'afip',
    status: 'requested',
    requestPayload: { invoiceType: invoice.invoiceType, total: invoice.total, customerId: invoice.customerId },
  });
  let saved = await repo.save(auth);
  eventBus.emit(FiscalAuthorizationEvents.REQUESTED, saved);
  logger.info({ action: 'create', fiscalAuthorizationId: saved.id, documentType: 'invoice', documentId: invoice.id, provider: 'afip', status: 'requested' }, 'Fiscal authorization requested');

  // Stub: simulate sandbox response
  const stub = process.env.AFIP_SANDBOX_STUB === 'true';
  if (stub) {
    const now = new Date();
    const exp = new Date(now);
    exp.setDate(exp.getDate() + 10);
    const cae = `STUB${Math.floor(Math.random() * 1e14)}`;
    saved.cae = cae;
    saved.caeExpiration = exp;
    saved.grantedAt = now;
    saved.responsePayload = { simulated: true, cae };
    saved.status = 'granted';
    saved = await repo.save(saved);

    invoice.cae = cae;
    invoice.caeExpiration = exp;
    invoice.fiscalIntegrationStatus = 'approved';
    if (invoice.status === 'draft' || invoice.status === 'pending_issue' || !invoice.status) {
      invoice.status = 'issued';
    }
    await invoiceRepo.save(invoice);

    eventBus.emit(FiscalAuthorizationEvents.GRANTED, { invoiceId: invoice.id, cae, caeExpiration: exp });
    logger.info({ action: 'transition', fiscalAuthorizationId: saved.id, from: 'requested', to: 'granted', cae }, 'Fiscal authorization granted');
  }

  eventBus.emit(FiscalAuthorizationEvents.LOGGED, saved);
  return saved;
}
