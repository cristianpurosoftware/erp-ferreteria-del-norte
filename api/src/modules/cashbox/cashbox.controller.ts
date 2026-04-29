import { Request, Response } from 'express';
import * as service from './cashbox.service';
import { PaginationQuery } from '../../common/pagination';
import { successResponse, paginatedResponse, createdResponse } from '../../common/response';

export async function create(req: Request, res: Response) {
  const result = await service.create(req.body);
  return createdResponse(res, result);
}

export async function update(req: Request, res: Response) {
  const result = await service.update(req.params.id, req.body);
  return successResponse(res, result);
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id);
  res.status(204).send();
}

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

function splitCsv(raw: unknown): string[] | undefined {
  if (raw == null) return undefined;
  const parts = Array.isArray(raw) ? raw.flatMap((v) => String(v).split(',')) : String(raw).split(',');
  const cleaned = parts.map((p) => p.trim()).filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

export async function getAllSessions(req: Request, res: Response) {
  const pagination = new PaginationQuery(req.query);
  const cashboxId = splitCsv(req.query.cashboxId);
  const userId = splitCsv(req.query.userId);
  const statusRaw = splitCsv(req.query.status);
  const status = statusRaw?.filter((s): s is 'open' | 'closed' => s === 'open' || s === 'closed');
  const { from, to } = req.query as Record<string, string | undefined>;

  const query = Object.assign(pagination, {
    cashboxId,
    userId,
    status: status?.length ? status : undefined,
    from,
    to,
  }) as service.SessionListQuery;

  const { items, meta } = await service.findAllSessions(query);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) {
  const item = await service.findById(req.params.id);
  return successResponse(res, item);
}

export async function open(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const result = await service.open(req.params.id, userId, req.body.openingBalance);
  return successResponse(res, result);
}

export async function close(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const userPermissions: string[] = (req as any).user?.permissions ?? [];
  const result = await service.close(
    req.params.id,
    userId,
    req.body.closingBalance,
    req.body.notes,
    userPermissions,
  );
  return successResponse(res, result);
}
