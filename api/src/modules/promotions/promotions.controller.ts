import { Request, Response } from 'express';
import * as service from './promotions.service';
import { successResponse, createdResponse, paginatedResponse, noContentResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
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
  const item = await service.activate(req.params.id);
  return successResponse(res, item);
}

export async function expire(req: Request, res: Response) {
  const item = await service.expire(req.params.id);
  return successResponse(res, item);
}

export async function cancel(req: Request, res: Response) {
  const item = await service.cancel(req.params.id);
  return successResponse(res, item);
}

export async function addItem(req: Request, res: Response) {
  const item = await service.addItem(req.params.id, req.body);
  return createdResponse(res, item);
}

export async function removeItem(req: Request, res: Response) {
  await service.removeItem(req.params.id, req.params.itemId);
  return noContentResponse(res);
}

export async function getActive(req: Request, res: Response) {
  const items = await service.findActive({
    customerId: req.query.customerId as string | undefined,
    zoneId: req.query.zoneId as string | undefined,
    channel: req.query.channel as string | undefined,
    customerCategory: req.query.customerCategory as string | undefined,
  });
  return successResponse(res, items);
}
