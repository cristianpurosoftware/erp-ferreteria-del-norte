import { AppDataSource } from '../../config/data-source';
import { CompanyEntity } from './data_access/company.entity';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { CompanyEvents } from './company.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(CompanyEntity);

export async function findFirst() {
  const item = await repo.findOne({ where: {} });
  if (!item) throw new NotFoundError('Empresa no encontrada');
  return item;
}

export async function update(data: Partial<CompanyEntity>) {
  const item = await findFirst();
  Object.assign(item, data);
  const saved = await repo.save(item);
  logger.info({ action: 'update', companyId: saved.id }, 'Company updated');
  eventBus.emit(CompanyEvents.UPDATED, saved);
  return saved;
}
