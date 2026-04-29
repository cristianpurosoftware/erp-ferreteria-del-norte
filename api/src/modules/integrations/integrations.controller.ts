import { Request, Response } from 'express';
import * as service from './integrations.service';
import { PaginationQuery } from '../../common/pagination';
import { successResponse, createdResponse, paginatedResponse, noContentResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const query = new PaginationQuery(req.query);
  const { items, meta } = await service.findAll(query);
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

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id);
  return noContentResponse(res);
}

export async function webhook(req: Request, res: Response) {
  const event = await service.handleWebhook(req.params.id, req.body);
  return successResponse(res, event);
}
