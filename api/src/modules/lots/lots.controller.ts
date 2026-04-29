import { Request, Response } from 'express';
import * as service from './lots.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getSummary(req: Request, res: Response) {
  const data = await service.findSummary(req.query as Record<string, unknown>);
  return successResponse(res, data);
}

export async function getById(req: Request, res: Response) {
  const item = await service.findById(req.params.id);
  return successResponse(res, item);
}

export async function create(req: Request, res: Response) {
  const item = await service.create(req.body);
  return createdResponse(res, item);
}

export async function block(req: Request, res: Response) {
  const item = await service.block(req.params.id);
  return successResponse(res, item);
}

export async function unblock(req: Request, res: Response) {
  const item = await service.unblock(req.params.id);
  return successResponse(res, item);
}

export async function expiring(req: Request, res: Response) {
  const days = req.query.days ? Number(req.query.days) : 30;
  const items = await service.findExpiring(days);
  return successResponse(res, items);
}

export async function runExpireJob(_req: Request, res: Response) {
  const count = await service.expireDueLots();
  return successResponse(res, { expired: count });
}

export async function stockByLot(req: Request, res: Response) {
  const items = await service.listStockByLot({
    productId: req.query.productId as string | undefined,
    warehouseId: req.query.warehouseId as string | undefined,
  });
  return successResponse(res, items);
}
