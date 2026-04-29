import { Request, Response } from 'express';
import * as service from './drivers.service';
import { successResponse, createdResponse, paginatedResponse, noContentResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) {
  return successResponse(res, await service.findById(req.params.id));
}

export async function create(req: Request, res: Response) {
  return createdResponse(res, await service.create(req.body));
}

export async function update(req: Request, res: Response) {
  return successResponse(res, await service.update(req.params.id, req.body));
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id);
  return noContentResponse(res);
}
