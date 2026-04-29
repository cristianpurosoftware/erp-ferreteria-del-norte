import { Request, Response } from 'express';
import * as service from './products.service';
import { successResponse, createdResponse, paginatedResponse, noContentResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) {
  const item = await service.findById(req.params.id);
  return successResponse(res, item);
}

export async function create(req: Request, res: Response) {
  const item = await service.create(req.body);
  return createdResponse(res, item);
}

export async function update(req: Request, res: Response) {
  const item = await service.update(req.params.id, req.body);
  return successResponse(res, item);
}

export async function activate(req: Request, res: Response) {
  const item = await service.changeStatus(req.params.id, 'active');
  return successResponse(res, item);
}

export async function discontinue(req: Request, res: Response) {
  const item = await service.changeStatus(req.params.id, 'discontinued');
  return successResponse(res, item);
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id);
  return noContentResponse(res);
}

export async function getPrices(req: Request, res: Response) {
  const items = await service.findPricesByProduct(req.params.id);
  return successResponse(res, items);
}

export async function getOrders(req: Request, res: Response) {
  const limit = parseInt(req.query.limit as string) || 10;
  const items = await service.findOrdersByProduct(req.params.id, limit);
  return successResponse(res, items);
}

export async function getBySku(req: Request, res: Response) {
  const item = await service.findBySku(req.params.sku);
  return successResponse(res, item);
}
