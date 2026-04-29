import { AppDataSource } from '../../config/data-source';
import { PromotionEntity } from './data_access/promotion.entity';
import { PromotionItemEntity } from './data_access/promotion-item.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { PromotionEvents } from './promotions.events';
import { logger } from '../../common/logger';

const promoRepo = AppDataSource.getRepository(PromotionEntity);
const itemRepo = AppDataSource.getRepository(PromotionItemEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['active', 'cancelled'],
  active: ['expired', 'cancelled'],
  expired: [],
  cancelled: [],
};

const PROMO_COLUMNS: ColumnMap = {
  status:           { type: 'enum',   column: 'status' },
  kind:             { type: 'enum',   column: 'kind' },
  channel:          { type: 'enum',   column: 'channel' },
  customerCategory: { type: 'enum',   column: 'customerCategory' },
  zoneId:           { type: 'enum',   column: 'zoneId' },
  code:             { type: 'string', column: 'code' },
  name:             { type: 'string', column: 'name' },
  priority:         { type: 'number', column: 'priority' },
  validFrom:        { type: 'date',   column: 'validFrom' },
  validTo:          { type: 'date',   column: 'validTo' },
};
const PROMO_SORTABLE: SortableMap = ['priority', 'code', 'name', 'status', 'validFrom', 'validTo', 'createdAt'];
const PROMO_SEARCH = ['code', 'name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = promoRepo.createQueryBuilder('p');
  query.applyTo(qb, 'p', PROMO_COLUMNS, PROMO_SORTABLE, PROMO_SEARCH, {
    field: 'priority', direction: 'DESC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await promoRepo.findOne({ where: { id }, relations: ['items'] });
  if (!item) throw new NotFoundError('Promoción no encontrada');
  return item;
}

export async function create(data: any) {
  const existing = await promoRepo.findOne({ where: { code: data.code } });
  if (existing) throw new BusinessLogicError('DUPLICATE_CODE', 'Ya existe una promoción con ese código');
  const item = promoRepo.create({ ...data, status: 'draft' });
  const saved = await promoRepo.save(item) as unknown as PromotionEntity;
  eventBus.emit(PromotionEvents.CREATED, saved);
  logger.info({ action: 'create', promotionId: saved.id, code: saved.code, name: saved.name }, 'Promotion created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  if (item.status !== 'draft') {
    throw new BusinessLogicError('INVALID_STATE', 'La promoción solo puede modificarse en estado borrador');
  }
  Object.assign(item, data);
  const saved = await promoRepo.save(item);
  logger.info({ action: 'update', promotionId: id }, 'Promotion updated');
  return saved;
}

export async function activate(id: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, 'active', 'promotion');
  item.status = 'active';
  const saved = await promoRepo.save(item);
  eventBus.emit(PromotionEvents.ACTIVATED, saved);
  logger.info({ action: 'transition', promotionId: id, from, to: 'active' }, 'Promotion activated');
  return saved;
}

export async function expire(id: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, 'expired', 'promotion');
  item.status = 'expired';
  const saved = await promoRepo.save(item);
  eventBus.emit(PromotionEvents.EXPIRED, saved);
  logger.info({ action: 'transition', promotionId: id, from, to: 'expired' }, 'Promotion expired');
  return saved;
}

export async function cancel(id: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, 'cancelled', 'promotion');
  item.status = 'cancelled';
  const saved = await promoRepo.save(item);
  eventBus.emit(PromotionEvents.CANCELLED, saved);
  logger.info({ action: 'transition', promotionId: id, from, to: 'cancelled' }, 'Promotion cancelled');
  return saved;
}

export async function addItem(promoId: string, data: any) {
  await findById(promoId);
  const item = itemRepo.create({ ...data, promotionId: promoId });
  const saved = await itemRepo.save(item) as unknown as PromotionItemEntity;
  eventBus.emit(PromotionEvents.ITEM_ADDED, saved);
  logger.info({ action: 'create', promotionId: promoId, promotionItemId: saved.id }, 'Promotion item added');
  return saved;
}

export async function removeItem(promoId: string, itemId: string) {
  const existing = await itemRepo.findOne({ where: { id: itemId, promotionId: promoId } });
  if (!existing) throw new NotFoundError('Ítem de promoción no encontrado');
  await itemRepo.softRemove(existing);
  eventBus.emit(PromotionEvents.ITEM_REMOVED, { id: itemId, promotionId: promoId });
  logger.info({ action: 'delete', promotionId: promoId, promotionItemId: itemId }, 'Promotion item removed');
  return { id: itemId };
}

export async function findActive(filters: { customerId?: string; zoneId?: string; channel?: string; customerCategory?: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const qb = promoRepo.createQueryBuilder('p')
    .leftJoinAndSelect('p.items', 'items')
    .where(`p.status = 'active'`)
    .andWhere('(p.valid_from IS NULL OR p.valid_from <= :today)', { today })
    .andWhere('(p.valid_to IS NULL OR p.valid_to >= :today)', { today });

  if (filters.zoneId) {
    qb.andWhere('(p.zone_id IS NULL OR p.zone_id = :zoneId)', { zoneId: filters.zoneId });
  }
  if (filters.channel) {
    qb.andWhere('(p.channel IS NULL OR p.channel = :channel)', { channel: filters.channel });
  }
  if (filters.customerCategory) {
    qb.andWhere('(p.customer_category IS NULL OR p.customer_category = :cc)', { cc: filters.customerCategory });
  }

  qb.orderBy('p.priority', 'DESC');
  return qb.getMany();
}
