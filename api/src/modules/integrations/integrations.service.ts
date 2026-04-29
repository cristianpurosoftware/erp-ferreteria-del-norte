import { AppDataSource } from '../../config/data-source';
import { IntegrationEntity } from './data_access/integration.entity';
import { IntegrationEventEntity } from './data_access/integration-event.entity';
import { PaginationQuery, buildPaginationMeta } from '../../common/pagination';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { IntegrationEvents } from './integrations.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(IntegrationEntity);
const eventRepo = AppDataSource.getRepository(IntegrationEventEntity);

export async function findAll(query: PaginationQuery) {
  const qb = repo.createQueryBuilder('i');
  if (query.search) {
    qb.where('i.provider ILIKE :search', { search: `%${query.search}%` });
  }
  qb.orderBy('i.createdAt', 'DESC').skip(query.skip).take(query.limit);
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: buildPaginationMeta(query, total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id }, relations: ['events'] });
  if (!item) throw new NotFoundError('Integración no encontrada');
  return item;
}

export async function create(data: Partial<IntegrationEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  logger.info({ action: 'create', integrationId: saved.id, provider: saved.provider }, 'Integration created');
  eventBus.emit(IntegrationEvents.ENABLED, saved);
  return saved;
}

export async function update(id: string, data: Partial<IntegrationEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  logger.info({ action: 'update', integrationId: id }, 'Integration updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  logger.info({ action: 'delete', integrationId: id }, 'Integration deleted');
}

export async function logEvent(integrationId: string, data: Partial<IntegrationEventEntity>) {
  const event = eventRepo.create({ integrationId, ...data });
  return eventRepo.save(event);
}

export async function handleWebhook(integrationId: string, payload: any) {
  const integration = await findById(integrationId);
  const event = await logEvent(integrationId, {
    eventType: payload.type || 'webhook',
    externalReference: payload.id || null,
    status: 'pending',
    detail: payload,
  });
  logger.info({ action: 'create', integrationId, provider: integration.provider, eventType: event.eventType }, 'Integration webhook received');
  return event;
}
