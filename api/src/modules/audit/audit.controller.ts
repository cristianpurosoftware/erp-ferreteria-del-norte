import { Request, Response } from 'express';
import { auditService } from './audit.service';
import { successResponse, paginatedResponse } from '../../common/response';
import { NotFoundError } from '../../common/errors';

function translateLegacyDates(q: Record<string, unknown>): Record<string, unknown> {
  // Maintain backward compatibility with the old audit API: dateFrom/dateTo
  // mapped directly onto createdAt. The new contract expects the column name
  // (createdAt) with From/To suffixes.
  const next = { ...q };
  if (next.dateFrom && !next.createdAtFrom) next.createdAtFrom = next.dateFrom;
  if (next.dateTo && !next.createdAtTo) next.createdAtTo = next.dateTo;
  return next;
}

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await auditService.findAll(translateLegacyDates(req.query as Record<string, unknown>));
  return paginatedResponse(res, items, meta);
}

export async function getFacets(_req: Request, res: Response) {
  const [entityTypes, actions] = await Promise.all([
    auditService.findDistinctEntityTypes(),
    auditService.findDistinctActions(),
  ]);
  return successResponse(res, { entityTypes, actions });
}

export async function getById(req: Request, res: Response) {
  const item = await auditService.findById(req.params.id);
  if (!item) throw new NotFoundError('Evento de auditoría no encontrado');
  return successResponse(res, item);
}

export async function getByEntity(req: Request, res: Response) {
  const { entityType, entityId } = req.params;
  const items = await auditService.findByEntity(entityType, entityId);
  return successResponse(res, items);
}
