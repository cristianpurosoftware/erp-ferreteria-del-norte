import { Request, Response } from 'express';
import * as service from './inventory.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getStock(req: Request, res: Response) {
  const filters = {
    productId: req.query.productId as string | undefined,
    warehouseId: req.query.warehouseId as string | undefined,
    lowStock: req.query.lowStock as string | undefined,
    search: req.query.search as string | undefined,
  };
  const items = await service.getStock(filters);
  return successResponse(res, items);
}

export async function getMovements(req: Request, res: Response) {
  const { items, meta } = await service.getMovements(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getMovementsSummary(req: Request, res: Response) {
  const data = await service.getMovementsSummary(req.query as Record<string, unknown>);
  return successResponse(res, data);
}

export async function createMovement(req: Request, res: Response) {
  const item = await service.createMovement(req.body);
  return createdResponse(res, item);
}

export async function adjustStock(req: Request, res: Response) {
  const item = await service.adjustStock(req.body);
  return createdResponse(res, item);
}

export async function transferStock(req: Request, res: Response) {
  const item = await service.transferStock(req.body);
  return createdResponse(res, item);
}
